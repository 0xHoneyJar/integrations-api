/**
 * IngestionDisposition — what a received event MEANS (SDD §11.1 / §16.1).
 *
 * Distinct from IngestionResult (result.ts), which is what PERSISTENCE did.
 * Telemetry, coverage, and tests count on these two tables only.
 *
 * `Tier` is defined HERE once (§16.10) and imported by coverage.ts — no
 * duplicate Tier definitions.
 */
import { Schema } from "effect";
import { Observation } from "./observation.js";

/** Event criticality axis (distinct from coverage classification). */
export const Tier = Schema.Literal("tier-1", "tier-2", "tier-3");
export type Tier = typeof Tier.Type;

/** Extensible reason-code enum for Ignored/Quarantined (SDD §16.4 / §17). */
export const ReasonCode = Schema.Literal(
  "message-content-excluded",
  "unclassified-event",
  "malformed-payload",
  "malformed-envelope",
  "unknown-provider",
  "id-conflict",
  "missing-event-id",
  "hash-mismatch",
);
export type ReasonCode = typeof ReasonCode.Type;

const Sha256Hex = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

/** Normalized into observations. */
export class Projected extends Schema.TaggedClass<Projected>()("Projected", {
  observations: Schema.Array(Observation),
}) {}

/** Classified non-domain event, ignored with a reason. */
export class Ignored extends Schema.TaggedClass<Ignored>()("Ignored", {
  reason: ReasonCode,
  classification: Tier,
}) {}

/**
 * Unknown/malformed behavior held for review. Persists a payload DIGEST, never
 * the raw payload (SDD §11.5 forensic-vs-PII resolution; INV-8).
 */
export class Quarantined extends Schema.TaggedClass<Quarantined>()("Quarantined", {
  reason: ReasonCode,
  patchCandidate: Schema.Boolean,
  payloadDigest: Sha256Hex,
  eventType: Schema.String,
}) {}

export const IngestionDisposition = Schema.Union(Projected, Ignored, Quarantined);
export type IngestionDisposition = typeof IngestionDisposition.Type;
