/**
 * Source manifest + evidence receipt (SDD §8, PRD §11.6, FR-6).
 *
 * Published contracts carry source digest, generator version, patch digest,
 * coverage report, verification evidence, and approval state (INV-5).
 * Retrieval/generation success is never sufficient publication evidence.
 */
import { Schema } from "effect";
import { Provider } from "./provider.js";

export const SourceClass = Schema.Literal(
  "openapi",
  "event-catalog",
  "docs",
  "changelog",
  "source",
);
export type SourceClass = typeof SourceClass.Type;

export const AppliedPatch = Schema.Struct({
  id: Schema.NonEmptyString,
  owner: Schema.NonEmptyString,
});

export const SourceManifest = Schema.Struct({
  provider: Provider,
  sourceClass: SourceClass,
  url: Schema.NonEmptyString,
  ref: Schema.NonEmptyString, // commit / tag / spec filename pin
  digest: Schema.optional(Schema.String),
  retrievedAt: Schema.NonEmptyString,
  generator: Schema.String,
  generatorVersion: Schema.String,
  discovered: Schema.Array(Schema.String),
  patches: Schema.Array(AppliedPatch),
  validation: Schema.Struct({
    semanticFocus: Schema.String,
    sourceDomain: Schema.String,
  }),
});
export type SourceManifest = typeof SourceManifest.Type;

export const EvidenceReceipt = Schema.Struct({
  provider: Provider,
  contractVersion: Schema.NonEmptyString,
  sourceRefs: Schema.Array(Schema.NonEmptyString),
  generatorVersion: Schema.String,
  patchSetDigest: Schema.String,
  coverageRef: Schema.NonEmptyString,
  staticResults: Schema.String,
  liveResults: Schema.String, // "tier-2-deferred" this wave
  testEnv: Schema.String, // "in-memory"
  productionReadiness: Schema.Literal("non-production", "production"),
  knownLimitations: Schema.Array(Schema.String),
  approvalState: Schema.Literal("unpublished", "approved"),
});
export type EvidenceReceipt = typeof EvidenceReceipt.Type;
