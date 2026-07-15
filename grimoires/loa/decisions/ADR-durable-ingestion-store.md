# ADR — Durable ingestion store contract (wave-2 target)

Status: **proposed** (names the wave-1 → production boundary)
Date: 2026-07-15
Cycle: integrations-api-simstim
Traces: SDD §16.4 / §16.6 / §17.6 · PRD §11.6 · Flatline sprint review (CRIT 820/860)

## Context

The wave-1 ingestion spine (`@0xhoneyjar/integrations-core`) is proven with an
**in-memory `Ref`-based `IngestionStore`**. `Ref.modify` gives linearizable atomic
commit/duplicate/conflict detection **within a single process**, which is sufficient to
prove the disposition algebra and idempotency contract deterministically. It is
explicitly **NON-PRODUCTION** (labeled in the README + evidence receipt):

- state is lost on process exit (not crash-safe),
- there is no cross-process / multi-instance deduplication,
- first-disposition is **sticky** (§16.4): a poison-pill first ingest (malformed or wrong
  payload) permanently shadows a corrected replay of the same key, returning `Conflict`
  forever — there is no recovery path in wave-1.

A production deployment must not use the in-memory store, and must not be shipped until
the durable contract below is implemented and its conformance tests pass.

## Decision

A production `IngestionStore` MUST preserve the wave-1 **observable contract** and add:

1. **Atomic compare-and-set persistence.** Idempotency-key registration and disposition
   persistence are ONE atomic storage transaction (no claim-before-persist window). The
   conflict record, when written, is persisted atomically — never a `Committed` returned
   for state that was not stored.
2. **Crash safety.** A crash between operations must not lose an accepted disposition or
   leave a half-written record.
3. **Cross-process / multi-instance dedup.** Concurrent commits of the same key across
   processes yield exactly one `Committed`; all others `Duplicate` (or `Conflict` on digest
   divergence).
4. **Conflict recovery.** A documented, audited path to resolve a sticky conflict — one of:
   admin re-key, supersede-with-audit (new version supersedes, prior retained), or a
   tombstone-then-replace. Poison-pill first writes MUST be recoverable without data loss.
5. **Quarantine retention.** Quarantine records persist `{reasonCode, eventType,
   payloadDigest, patchCandidate}` only — never raw payload/PII (§11.5) — with a defined
   retention policy.

## Conformance target

`packages/integrations-core/tests/durable-store-contract.skip.test.ts` encodes these
requirements as **skipped** tests (an executable target). Wave-2 un-skips them against the
real backend; they MUST pass before the spine is labeled `production` in the evidence
receipt.

## Consequences

- Wave-1 ships as a reviewable reference with an honest NON-PRODUCTION label.
- The public API (`ingestUnknown`, service tags, disposition/result algebra) is stable
  across the store swap — only the `IngestionStore` layer changes.

## Next ratification decision

Whether wave-2 lands the durable store on the existing `freeside` persistence substrate or
introduces a dedicated ingestion datastore (independent scaling / failure containment per
architecture §12) — **operator decision, not taken here.**
