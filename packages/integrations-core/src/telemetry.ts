/**
 * Telemetry — span annotation with a strict attribute ALLOWLIST (SDD §11.5 /
 * §16.11). NEVER payload, user fields, or secrets. Identity is annotated before
 * normalize; disposition after it is computed (§16.11 ordering).
 */
import { Effect } from "effect";
import type { RawEventEnvelope } from "./protocol/envelope.js";

export const annotateIdentity = (
  envelope: RawEventEnvelope,
  idempotencyKey: string | null,
): Effect.Effect<void> =>
  Effect.annotateCurrentSpan({
    provider: envelope.provider,
    connectionId: envelope.connectionId,
    tenantId: envelope.tenantId,
    eventType: envelope.eventType,
    idempotencyKey: idempotencyKey ?? "(none)",
  });

export const annotateDisposition = (
  tag: string,
  reasonCode?: string,
): Effect.Effect<void> =>
  Effect.annotateCurrentSpan({
    "disposition._tag": tag,
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  });
