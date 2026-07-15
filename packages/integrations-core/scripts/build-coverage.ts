#!/usr/bin/env bun
/**
 * build-coverage — emit the Discord coverage report + evidence receipt from the
 * single classification table (§16.11). FAIL-CLOSED: pass `--tests-passed` (or
 * INTEGRATIONS_TESTS_PASSED=1) only after the suite is green; otherwise the
 * script refuses to emit an evidence receipt.
 *
 *   bun scripts/build-coverage.ts --tests-passed
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { CoverageManifest } from "../src/protocol/coverage.js";
import { EvidenceReceipt } from "../src/protocol/source.js";
import {
  assertTestsPassed,
  discordCoverageManifest,
  discordEvidenceReceipt,
} from "../src/coverage-build.js";

const testsPassed =
  process.argv.includes("--tests-passed") || process.env.INTEGRATIONS_TESTS_PASSED === "1";
assertTestsPassed(testsPassed);

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
// Stable generation timestamp (cycle date) so re-runs don't churn the artifact.
const generatedAt = process.env.INTEGRATIONS_GENERATED_AT ?? "2026-07-15T00:00:00Z";

const coverage = discordCoverageManifest(generatedAt);
const evidence = discordEvidenceReceipt("coverage/discord.coverage.json");

const write = <A, I>(rel: string, schema: Schema.Schema<A, I>, value: A): void => {
  const path = join(pkgRoot, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(Schema.encodeSync(schema)(value), null, 2)}\n`);
  console.log(`wrote ${rel}`);
};

write("coverage/discord.coverage.json", CoverageManifest, coverage);
write("evidence/discord.evidence.json", EvidenceReceipt, evidence);
