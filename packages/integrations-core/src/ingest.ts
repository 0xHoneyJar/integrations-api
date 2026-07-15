/**
 * Ingestion orchestration — the correctness spine (AD-4, SDD §6.3 / §16 / §17).
 *
 * `ingestUnknown` is the SOLE public boundary (§17.4): it owns envelope decode
 * and its malformed-envelope quarantine. `ingestEnvelope` is INTERNAL (never
 * exported from the package barrel).
 *
 * Failure taxonomy (§16.3) — the load-bearing invariant:
 *   - typed `AdapterContractError`        → Quarantined{malformed-payload}
 *   - missing transport id                → Quarantined{missing-event-id}
 *   - rawPayloadHash ≠ computed            → Quarantined{hash-mismatch}
 *   - unknown/unregistered provider        → Quarantined{unknown-provider}
 *   - non-serializable payload             → Quarantined{malformed-payload}
 *   - store commit failure (IngestionStoreError) → SURFACES (retryable)
 *   - unexpected defect                    → propagates (die) — never laundered
 * Every RawEventEnvelope terminates as Committed | Duplicate | Conflict, or
 * fails loudly. No silent drops (INV-1).
 */
import { Effect, Schema } from "effect";
import { RawEventEnvelope } from "./protocol/envelope.js";
import { Quarantined, type IngestionDisposition } from "./protocol/disposition.js";
import {
  Committed,
  Conflict,
  Duplicate,
  type IngestionResult,
} from "./protocol/result.js";
import { canonicalDigest, idempotencyKey, quarantineKey, safeDigest } from "./identity.js";
import { AdapterRegistry, IngestionStore } from "./services.js";
import { annotateDisposition, annotateIdentity } from "./telemetry.js";

/** Persist a quarantine record under its own identity and build the result. */
const commitQuarantine = (envelope: RawEventEnvelope, q: Quarantined) =>
  Effect.gen(function* () {
    const store = yield* IngestionStore;
    const qkey = quarantineKey(
      envelope.provider,
      envelope.tenantId,
      envelope.connectionId,
      q.payloadDigest,
    );
    yield* annotateDisposition(q._tag, q.reason);
    const status = yield* store.quarantine(qkey, q);
    return status === "duplicate"
      ? new Duplicate({ idempotencyKey: qkey, upstreamEventId: envelope.upstreamEventId })
      : new Committed({
          idempotencyKey: qkey,
          upstreamEventId: envelope.upstreamEventId,
          disposition: q,
        });
  });

/** INTERNAL — post-decode orchestration. Not exported from the barrel (§17.4). */
export const ingestEnvelope = Effect.fn("Integrations.ingestEnvelope")(function* (
  envelope: RawEventEnvelope,
) {
  const registry = yield* AdapterRegistry;
  const store = yield* IngestionStore;

  const key = idempotencyKey(envelope);
  yield* annotateIdentity(envelope, key);

  // Non-serializable payload → malformed-payload quarantine (§16.9), never a defect.
  let digest: string;
  try {
    digest = canonicalDigest(envelope.payload);
  } catch {
    return yield* commitQuarantine(
      envelope,
      new Quarantined({
        reason: "malformed-payload",
        patchCandidate: true,
        payloadDigest: safeDigest(envelope.payload),
        eventType: envelope.eventType,
      }),
    );
  }

  // §16.2 absent transport id → quarantine (no content-fallback key).
  if (key === null) {
    return yield* commitQuarantine(
      envelope,
      new Quarantined({
        reason: "missing-event-id",
        patchCandidate: false,
        payloadDigest: digest,
        eventType: envelope.eventType,
      }),
    );
  }

  // §16.7 rawPayloadHash claim must match the computed digest.
  if (envelope.rawPayloadHash !== undefined && envelope.rawPayloadHash !== digest) {
    return yield* commitQuarantine(
      envelope,
      new Quarantined({
        reason: "hash-mismatch",
        patchCandidate: false,
        payloadDigest: digest,
        eventType: envelope.eventType,
      }),
    );
  }

  // §16.8 unknown/unregistered provider → quarantine BEFORE normalize.
  if (!registry.has(envelope.provider)) {
    return yield* commitQuarantine(
      envelope,
      new Quarantined({
        reason: "unknown-provider",
        patchCandidate: false,
        payloadDigest: digest,
        eventType: envelope.eventType,
      }),
    );
  }

  // Normalize — ONLY AdapterContractError converts to Quarantined. Store errors
  // and unexpected defects are NOT caught here (they surface / propagate).
  const disposition: IngestionDisposition = yield* registry.normalize(envelope).pipe(
    Effect.catchTag("AdapterContractError", () =>
      Effect.succeed(
        new Quarantined({
          reason: "malformed-payload",
          patchCandidate: true,
          payloadDigest: digest,
          eventType: envelope.eventType,
        }),
      ),
    ),
  );
  yield* annotateDisposition(
    disposition._tag,
    "reason" in disposition ? disposition.reason : undefined,
  );

  const outcome = yield* store.commit(key, digest, disposition);
  switch (outcome._tag) {
    case "committed":
      return new Committed({
        idempotencyKey: key,
        upstreamEventId: envelope.upstreamEventId,
        disposition,
      });
    case "duplicate":
      return new Duplicate({ idempotencyKey: key, upstreamEventId: envelope.upstreamEventId });
    case "conflict":
      return new Conflict({
        idempotencyKey: key,
        priorDigest: outcome.priorDigest,
        newDigest: digest,
      });
  }
});

/**
 * PUBLIC boundary (§17.4). Owns envelope decode: a `ParseError` becomes a
 * durable `malformed-envelope` quarantine with a safely-derived digest and a
 * placeholder event type — untrusted fields are never propagated.
 */
export const ingestUnknown = Effect.fn("Integrations.ingestUnknown")(function* (
  input: unknown,
) {
  const store = yield* IngestionStore;
  const decoded = yield* Schema.decodeUnknown(RawEventEnvelope)(input).pipe(Effect.either);

  if (decoded._tag === "Left") {
    const digest = safeDigest(input);
    const q = new Quarantined({
      reason: "malformed-envelope",
      patchCandidate: false,
      payloadDigest: digest,
      eventType: "(undecodable)",
    });
    const qkey = quarantineKey("unknown", "unknown", "unknown", digest);
    const status = yield* store.quarantine(qkey, q);
    const result: IngestionResult =
      status === "duplicate"
        ? new Duplicate({ idempotencyKey: qkey })
        : new Committed({ idempotencyKey: qkey, disposition: q });
    return result;
  }

  return yield* ingestEnvelope(decoded.right);
});
