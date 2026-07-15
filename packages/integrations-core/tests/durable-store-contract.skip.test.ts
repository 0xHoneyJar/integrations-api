/**
 * Durable ingestion-store CONFORMANCE TARGET (§17.6, ADR-durable-ingestion-store).
 *
 * These tests are intentionally SKIPPED in wave-1 (the in-memory store is
 * NON-PRODUCTION). They encode the required production durable semantics as an
 * executable target: wave-2 un-skips them against the real transactional
 * backend, and they MUST pass before the spine is labeled `production` in the
 * evidence receipt. A skipped stub keeps the suite green while making the
 * deferred contract visible and machine-checkable later.
 */
import { describe, test } from "bun:test";

describe.skip("durable IngestionStore contract (wave-2)", () => {
  test("atomic compare-and-set: idempotency registration + disposition persist in one transaction", () => {});
  test("crash safety: an accepted disposition survives a simulated crash between operations", () => {});
  test("cross-process dedup: concurrent commits of one key across processes → exactly one Committed", () => {});
  test("conflict recovery: a sticky poison-pill conflict can be superseded-with-audit without data loss", () => {});
  test("quarantine retention: records persist digest+reason only (no raw payload), honoring the retention policy", () => {});
});
