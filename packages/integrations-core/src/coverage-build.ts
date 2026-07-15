/**
 * Coverage + evidence builders (SDD §8, PRD §11.6, §16.11).
 *
 * Coverage is derived from the single `DISCORD_CLASSIFICATION` table. Both
 * builders validate their output against the protocol schemas (fail-closed on
 * any schema violation). `assertTestsPassed` enforces fail-closed generation:
 * no evidence receipt is emitted when tests did not pass.
 */
import { Schema } from "effect";
import { CoverageManifest } from "./protocol/coverage.js";
import { EvidenceReceipt } from "./protocol/source.js";
import { DISCORD_CLASSIFICATION } from "./providers/discord.js";

export const CONTRACT_VERSION = "discord@v10-wave1";

const DIMENSIONS = [
  { dimension: "discovery", claim: "All wave-1 admitted Gateway member events classified; any other event → quarantine (no silent drop)." },
  { dimension: "generation", claim: "Design-level: REST + Gateway source manifests pinned; no generator runtime this wave (INV-4)." },
  { dimension: "behavior", claim: "ADD/UPDATE/REMOVE decode to observations; malformed payload → AdapterContractError → quarantine." },
  { dimension: "ingestion", claim: "Every event terminates committed/duplicate/conflict/quarantine, or fails loudly (INV-1)." },
  { dimension: "reconciliation", claim: "Tier-2 deferred — no live Gateway replay/backfill this wave." },
  { dimension: "lifecycle", claim: "In-memory commit/duplicate/conflict tested; durable CRUD is Tier-2 (durable-store ADR)." },
  { dimension: "evidence", claim: "REST + Gateway source manifests + this coverage report + the evidence receipt." },
] as const;

export const KNOWN_LIMITATIONS: ReadonlyArray<string> = [
  "Wave-1 ingestion spine is NON-PRODUCTION: in-memory Ref store, not crash-safe / cross-process / DB-transactional (§17.6).",
  "First disposition is sticky; poison-pill conflict has no recovery path until the durable-store ADR is implemented (§16.4 / §17.6).",
  "No transport this wave: Gateway/webhook receipt, resume/sequence-gap replay, and Ed25519 signature verification are Tier-2 (§17.7).",
  "GUILD_MEMBER_REMOVE cannot distinguish leave vs kick vs ban.",
  "upstreamEventId is transport-assigned; durable Discord identity from Gateway session/sequence is Tier-2 (§17.1).",
  "Evidence generation uses a wave-1 self-attested --tests-passed flag; wave-2 must bind the receipt to a CI test-artifact digest + commit SHA (flatline code-review 720/730).",
  "Identical malformed inputs collapse into one quarantine record (idempotent by design); per-delivery occurrence counts/timestamps are deferred (flatline code-review 760).",
];

/** Build + validate the Discord coverage manifest (fail-closed on schema drift). */
export const discordCoverageManifest = (
  generatedAt: string,
): typeof CoverageManifest.Type =>
  Schema.decodeUnknownSync(CoverageManifest)({
    provider: "discord",
    contractVersion: CONTRACT_VERSION,
    dimensions: DIMENSIONS.map((d) => ({ ...d })),
    surface: DISCORD_CLASSIFICATION.map((s) => ({ ...s })),
    generatedAt,
  });

/** Build + validate the Discord evidence receipt (fail-closed on schema drift). */
export const discordEvidenceReceipt = (
  coverageRef: string,
): typeof EvidenceReceipt.Type =>
  Schema.decodeUnknownSync(EvidenceReceipt)({
    provider: "discord",
    contractVersion: CONTRACT_VERSION,
    sourceRefs: ["source/discord.rest.source.json", "source/discord.gateway.source.json"],
    generatorVersion: "design-level-no-generator",
    patchSetDigest: "none",
    coverageRef,
    staticResults: "typecheck + tests green (bun test packages)",
    liveResults: "tier-2-deferred",
    testEnv: "in-memory",
    productionReadiness: "non-production",
    knownLimitations: [...KNOWN_LIMITATIONS],
    approvalState: "unpublished",
  });

export class CoverageBuildError extends Error {}

/** Fail-closed guard (§16.11): refuse to emit evidence when tests did not pass. */
export const assertTestsPassed = (passed: boolean): void => {
  if (!passed) {
    throw new CoverageBuildError(
      "fail-closed: refusing to emit a coverage/evidence receipt when tests did not pass (§16.11)",
    );
  }
};
