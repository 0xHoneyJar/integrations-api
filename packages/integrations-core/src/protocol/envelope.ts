/**
 * RawEventEnvelope — the boundary object the ingestion/transport layer produces
 * for every received upstream event.
 *
 * Field constraints per SDD §16.10: identifiers are non-empty; rawPayloadHash,
 * when present, is a sha256 hex claim (verified against the computed digest at
 * ingest — §16.7). `upstreamEventId` is a TRANSPORT-assigned delivery identity
 * (§17.1), NOT a provider-payload field — Discord Gateway events carry no
 * durable per-event id (verified vs primary source). It is optional: an absent
 * id is quarantined `missing-event-id` at ingest (§16.2), never content-keyed.
 */
import { Schema } from "effect";
import { Provider } from "./provider.js";

const NonEmpty = Schema.NonEmptyString;
const Sha256Hex = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

export class RawEventEnvelope extends Schema.Class<RawEventEnvelope>("RawEventEnvelope")({
  provider: Provider,
  connectionId: NonEmpty,
  tenantId: NonEmpty,
  eventType: NonEmpty,
  // transport-assigned delivery id (§17.1) — optional; absent → missing-event-id quarantine
  upstreamEventId: Schema.optional(NonEmpty),
  observedAt: NonEmpty,
  receivedAt: NonEmpty,
  sourceContractVersion: NonEmpty,
  // untrusted claim; verified against canonicalDigest(payload) at ingest (§16.7)
  rawPayloadHash: Schema.optional(Sha256Hex),
  payload: Schema.Unknown,
}) {}
