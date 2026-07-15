# Sprint 1 Implementation Report — Protocol + identity foundation

## Executive Summary

Scaffolded the new additive package `@0xhoneyjar/integrations-core` and landed the
protocol schemas, event-identity module, and typed errors — all in verified Effect
3.21.2 idioms (SDD §2 reconciliation), all green. `@0xhoneyjar/medium-registry` and the
renderer packages are untouched. No adapter, store, or ingestion yet (Sprints 2–3).

## AC Verification

| Acceptance criterion (from sprint.md S1) | Status | Evidence |
|---|---|---|
| S1-T1: pkg scaffolded, Effect peerDep `>=3.21.2 <4`, wired into workspace, typecheck includes it | ✓ Met | `packages/integrations-core/package.json:41` (peerDep), `package.json:11` (workspace), `tsconfig.json:8` (ref); typecheck output `@0xhoneyjar/integrations-core ... code 0` |
| S1-T2: protocol schemas in Effect 3.21.2; schema round-trip | ✓ Met | `src/protocol/{provider,envelope,observation,disposition,result,coverage,source}.ts`; `tests/schema.test.ts` (13 tests) |
| S1-T3: tenantId-scoped key (§16.1), canonicalization (§17.8), absent-id → null (§16.2) | ✓ Met | `src/identity.ts:66-73` (key incl tenantId, null on absent), `:29-49` (canonicalization), `tests/identity.test.ts` |
| S1-T3 test: key includes tenantId; two tenants same conn → distinct; absent→null; digest deterministic + order-independent; non-serializable rejected | ✓ Met | `tests/identity.test.ts:22-73` (11 assertions incl. `not.toBe` cross-tenant, `toBeNull`, `toThrow` bigint) |
| S1-T4: `AdapterContractError` + `IngestionStoreError` (`Schema.TaggedError`) | ✓ Met | `src/errors.ts:14,23` |
| S1-T5: NonEmptyString ids + sha256 pattern; single `Tier` in disposition.ts imported by coverage.ts; reason-codes incl `missing-event-id`,`hash-mismatch` | ✓ Met | `src/protocol/envelope.ts:17-18`, `disposition.ts:20` (Tier once), `coverage.ts:13` (imports Tier), `disposition.ts:24-33` (reason codes); `tests/schema.test.ts:24-34` (empty-id + bad-hash rejection) |
| Verification: typecheck/test/build green; 324 existing tests still pass (AC-1, AC-3) | ✓ Met | full typecheck 4/4 code 0; `bun test packages` → **349 pass / 0 fail** (324 baseline + 25 new); build 4/4 code 0 |

## Tasks Completed

- **Package scaffold** — `packages/integrations-core/{package.json,tsconfig.json,README.md}`; root `package.json` workspaces + root `tsconfig.json` references updated (additive).
- **Protocol** — `src/protocol/*` (7 modules + barrel): Provider union, RawEventEnvelope (constrained), Membership{Observed,Changed,Revoked} + Observation union, Projected/Ignored/Quarantined + IngestionDisposition, Committed/Duplicate/Conflict + IngestionResult, CoverageManifest, SourceManifest/EvidenceReceipt.
- **Identity** — `src/identity.ts`: `stableStringify` (deterministic, throws on non-serializable), `canonicalDigest`, tenant-scoped `idempotencyKey` (null on absent id), `safeDigest`, `quarantineKey`.
- **Errors** — `src/errors.ts`: two `Schema.TaggedError` channels.
- **Barrel** — `src/index.ts` exports protocol + errors + identity (NOT ingestEnvelope, per §17.4).

## Testing Summary

- `tests/identity.test.ts` (12 tests) — key composition, cross-tenant isolation, absent-id null, digest determinism/order-independence/rejection, quarantine-key namespacing.
- `tests/schema.test.ts` (13 tests) — envelope constraint rejection, observation shapes, disposition/result construction, Conflict terminal.
- Run: `bun test packages/integrations-core` → 25 pass / 0 fail.

## Known Limitations

- No ingestion/adapter/store yet (Sprints 2–3). Barrel intentionally omits `ingestEnvelope`.
- `Tier` criticality vs coverage classification are separate axes (documented).

## Verification Steps

```bash
cd packages/integrations-core && bun run typecheck   # 0 errors
bun test packages/integrations-core                  # 25 pass
bun run typecheck && bun test packages && bun run build   # whole workspace green, 349 pass
```

Status: **COMPLETED**
