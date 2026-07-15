/**
 * Services — AdapterRegistry (provider-keyed, §16.8) + IngestionStore
 * (atomic commit/quarantine, §16.3/§17.2). Effect 3.21.2 `Context.Tag` idiom.
 *
 * The in-memory store is the wave-1 OBSERVABLE ATOMIC CONTRACT (§16.6): a
 * production transactional backend must preserve the same properties. It is
 * first-write-wins (sticky, §16.4): a stored key re-seen with a different digest
 * is a `conflict`, never an overwrite.
 */
import { Context, Effect, Layer, Ref } from "effect";
import type { RawEventEnvelope } from "./protocol/envelope.js";
import type { IngestionDisposition, Quarantined } from "./protocol/disposition.js";
import type { Provider } from "./protocol/provider.js";
import { AdapterContractError, IngestionStoreError } from "./errors.js";

// ---------------------------------------------------------------------------
// AdapterRegistry — provider-keyed dispatch (§16.8)
// ---------------------------------------------------------------------------

export type AdapterFn = (
  envelope: RawEventEnvelope,
) => Effect.Effect<IngestionDisposition, AdapterContractError>;

export interface AdapterRegistryShape {
  /** True iff an adapter is registered for the provider (checked before normalize). */
  readonly has: (provider: Provider) => boolean;
  readonly normalize: (
    envelope: RawEventEnvelope,
  ) => Effect.Effect<IngestionDisposition, AdapterContractError>;
}

export class AdapterRegistry extends Context.Tag("integrations/AdapterRegistry")<
  AdapterRegistry,
  AdapterRegistryShape
>() {}

export const makeAdapterRegistry = (
  adapters: Partial<Record<Provider, AdapterFn>>,
): AdapterRegistryShape => ({
  has: (provider) => adapters[provider] !== undefined,
  normalize: (envelope) => {
    const fn = adapters[envelope.provider];
    if (fn === undefined) {
      // Safety net — the primary unknown-provider path is the `has()` guard in ingest.
      return Effect.fail(
        new AdapterContractError({
          provider: envelope.provider,
          eventType: envelope.eventType,
          reason: "no adapter registered for provider",
        }),
      );
    }
    return fn(envelope);
  },
});

export const AdapterRegistryLayer = (
  adapters: Partial<Record<Provider, AdapterFn>>,
): Layer.Layer<AdapterRegistry> =>
  Layer.succeed(AdapterRegistry, makeAdapterRegistry(adapters));

// ---------------------------------------------------------------------------
// IngestionStore — atomic idempotent commit + quarantine (§16.3/§17.2)
// ---------------------------------------------------------------------------

export type CommitOutcome =
  | { readonly _tag: "committed" }
  | { readonly _tag: "duplicate" }
  | { readonly _tag: "conflict"; readonly priorDigest: string };

export type QuarantineOutcome = "committed" | "duplicate";

interface StoredRecord {
  readonly digest: string;
  readonly disposition: IngestionDisposition;
}

export interface IngestionStoreShape {
  /** Atomic idempotent commit keyed by the event idempotency key. */
  readonly commit: (
    key: string,
    digest: string,
    disposition: IngestionDisposition,
  ) => Effect.Effect<CommitOutcome, IngestionStoreError>;
  /** Atomic persist of a quarantine record under its OWN identity (§17.2). */
  readonly quarantine: (
    quarantineKey: string,
    disposition: Quarantined,
  ) => Effect.Effect<QuarantineOutcome, IngestionStoreError>;
  /** Inspection accessor — used by tests to prove persisted state (not silently). */
  readonly getRecord: (
    key: string,
  ) => Effect.Effect<StoredRecord | undefined, IngestionStoreError>;
}

export class IngestionStore extends Context.Tag("integrations/IngestionStore")<
  IngestionStore,
  IngestionStoreShape
>() {}

/**
 * In-memory store. `Ref.modify` gives linearizable single-op semantics — atomic
 * duplicate/conflict detection holds under concurrent commits (AC-6). NEVER
 * fails (`IngestionStoreError` channel is present for the production contract).
 */
export const InMemoryIngestionStoreLayer: Layer.Layer<IngestionStore> = Layer.effect(
  IngestionStore,
  Effect.gen(function* () {
    const ref = yield* Ref.make(new Map<string, StoredRecord>());

    const commit: IngestionStoreShape["commit"] = (key, digest, disposition) =>
      Ref.modify(ref, (map): readonly [CommitOutcome, Map<string, StoredRecord>] => {
        const existing = map.get(key);
        if (existing === undefined) {
          const next = new Map(map);
          next.set(key, { digest, disposition });
          return [{ _tag: "committed" }, next];
        }
        if (existing.digest === digest) return [{ _tag: "duplicate" }, map];
        // sticky — do NOT overwrite (§16.4)
        return [{ _tag: "conflict", priorDigest: existing.digest }, map];
      });

    const quarantine: IngestionStoreShape["quarantine"] = (quarantineKey, disposition) =>
      Ref.modify(ref, (map): readonly [QuarantineOutcome, Map<string, StoredRecord>] => {
        if (map.has(quarantineKey)) return ["duplicate", map];
        const next = new Map(map);
        next.set(quarantineKey, { digest: disposition.payloadDigest, disposition });
        return ["committed", next];
      });

    const getRecord: IngestionStoreShape["getRecord"] = (key) =>
      Ref.get(ref).pipe(Effect.map((map) => map.get(key)));

    return { commit, quarantine, getRecord };
  }),
);
