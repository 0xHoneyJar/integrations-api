/**
 * Coverage manifest — the 7-dimension coverage vector (SDD §8, PRD §11.6).
 *
 * "100% coverage" = complete surface classification + complete Tier-1
 * conformance + zero silent ingestion loss (INV-9). `Tier` is imported from
 * disposition.ts (single definition, §16.10).
 */
import { Schema } from "effect";
import { Provider } from "./provider.js";
import { ReasonCode, Tier } from "./disposition.js";

export const CoverageDimension = Schema.Literal(
  "discovery",
  "generation",
  "behavior",
  "ingestion",
  "reconciliation",
  "lifecycle",
  "evidence",
);
export type CoverageDimension = typeof CoverageDimension.Type;

/** One admitted surface entry classified by tier + disposition. */
export const SurfaceEntry = Schema.Struct({
  event: Schema.NonEmptyString,
  tier: Tier,
  disposition: Schema.String,
  reasonCode: Schema.optional(ReasonCode),
});
export type SurfaceEntry = typeof SurfaceEntry.Type;

export const DimensionClaim = Schema.Struct({
  dimension: CoverageDimension,
  claim: Schema.String,
});

export const CoverageManifest = Schema.Struct({
  provider: Provider,
  contractVersion: Schema.NonEmptyString,
  dimensions: Schema.Array(DimensionClaim),
  surface: Schema.Array(SurfaceEntry),
  generatedAt: Schema.String,
});
export type CoverageManifest = typeof CoverageManifest.Type;
