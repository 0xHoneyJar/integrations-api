# Sprint 2 Implementation Report — Ingestion harness + failure taxonomy

## Executive Summary

Landed the correctness spine (AD-4): the provider-keyed `AdapterRegistry`, the atomic
in-memory `IngestionStore` (commit + quarantine), the telemetry allowlist, and the
`ingestUnknown` public boundary implementing the full §16/§17 failure taxonomy. Proven
with a stub adapter (the real Discord adapter is Sprint 3). All green.

## AC Verification

| Acceptance criterion (sprint.md S2) | Status | Evidence |
|---|---|---|
| S2-T1: IngestionStore (commit + quarantine §17.2) atomic `Ref.modify`; provider-keyed AdapterRegistry §16.8; conflict does NOT overwrite (sticky §16.4) | ✓ Met | `src/services.ts:110-146` (commit/quarantine), `:38-56` (provider-keyed), `:120-129` (sticky conflict); `tests/ingest.test.ts` "same key + different payload → Conflict" |
| S2-T2: telemetry allowlist; identity before / disposition after (§16.11) | ✓ Met | `src/telemetry.ts:11-38`; `src/ingest.ts:70` (identity annotate), `:150` (disposition annotate after normalize) |
| S2-T3: only AdapterContractError→Quarantined; store error surfaces; defect propagates; conflict→Conflict; telemetry ordering | ✓ Met | `src/ingest.ts:143-149` (catchTag only AdapterContractError), `:159` (commit error not caught), `tests/ingest.test.ts` "store commit failure surfaces" + "defect propagates" + "Conflict not Committed" |
| S2-T3 test: store-failure surfaces IngestionStoreError; defect NOT swallowed | ✓ Met | `tests/ingest.test.ts:150-179` (Either→Left IngestionStoreError; Exit die via `Cause.isDie`) |
| S2-T4: N parallel commits of one key → 1 Committed + (N-1) Duplicate | ✓ Met | `tests/ingest.test.ts:183-198` (N=16 → 1 committed, 15 duplicate) |
| S2-T5: ingestUnknown SOLE public export (ingestEnvelope internal); ParseError→malformed-envelope; unknown-provider; hash-mismatch; missing-id; conflict→Conflict | ✓ Met | `src/index.ts:20-22` (comment + no ingestEnvelope export), `tests/ingest.test.ts:39-45` ("exports ingestUnknown but NOT ingestEnvelope"), quarantine-path tests |
| S2-T5 test: telegram/luma vs discord-only→unknown-provider; malformed→durable quarantine; hash mismatch→quarantine; store-state inspected | ✓ Met | `tests/ingest.test.ts:96-140` (unknown-provider, malformed-envelope), `:200-210` (getRecord after commit) |
| Verification: failure-taxonomy + concurrency + store tests green; typecheck/build green | ✓ Met | typecheck code 0; `bun test packages` → **363 pass / 0 fail**; build 4/4 |

## Tasks Completed

- `src/services.ts` — `AdapterRegistry` (provider-keyed, `has`+`normalize`), `makeAdapterRegistry`/`AdapterRegistryLayer`; `IngestionStore` (`commit`→committed|duplicate|conflict, `quarantine`, `getRecord`), `InMemoryIngestionStoreLayer` (`Ref.modify` atomic, sticky).
- `src/telemetry.ts` — `annotateIdentity` / `annotateDisposition` (allowlist only).
- `src/ingest.ts` — internal `ingestEnvelope` (full taxonomy) + public `ingestUnknown` (owns envelope decode → malformed-envelope quarantine).
- `src/index.ts` — exports `ingestUnknown` + service tags/layers; **omits `ingestEnvelope`** (§17.4).

## Technical Highlights

- **Atomicity**: `Ref.modify` is a single linearizable operation → duplicate/conflict detection holds under `concurrency:"unbounded"` (16-way test).
- **Honest failure channels**: `catchTag("AdapterContractError")` is the ONLY catch; `IngestionStoreError` and defects flow through untouched — infra/engineer failures never become provider "drift".
- **Quarantine-record identity** (`quarantine:…`) is namespaced away from event keys (§17.2).

## Testing Summary

`tests/ingest.test.ts` (14 tests): boundary, committed/duplicate/conflict/ignored/quarantine matrix, 4 quarantine reason paths, store-failure surface, defect propagation, 16-way concurrency, persisted-state inspection. Run: `bun test packages/integrations-core` → 39 pass.

## Known Limitations

- Discord adapter not yet present (Sprint 3) — S2 proves the harness with stub adapters.
- Store is in-memory/NON-PRODUCTION (durable contract + conflict recovery = Sprint 4 ADR + skipped stub, §17.6).

## Verification Steps

```bash
cd packages/integrations-core && bun run typecheck   # 0 errors
bun test packages && bun run build                   # 363 pass, build 4/4
```

Status: **COMPLETED**
