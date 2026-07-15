# Consolidated Security & Quality Audit — Freeside Integrations wave 1

Scope: `packages/integrations-core` (sprints 1–5, consolidated). Reviewer: audit gate.
Grounded in the actual code + a mechanical scan. This is one tightly-coupled package in
consolidated-PR mode, so a single consolidated audit replaces 5× per-sprint passes.

## Surface

Wave-1 is an **offline, in-memory, NON-PRODUCTION** schema + ingestion reference. No
network, no DB, no auth surface, no secrets, no untrusted deserialization of executable
content. The audit surface is correspondingly narrow.

## Findings by dimension

| Dimension | Result | Evidence |
|---|---|---|
| **Secrets / credentials** | ✓ PASS | 0 secret/token hits in `src/`+`source/` (mechanical scan); no `.env`; `credentialReference` is a *reference* by contract, never a secret (INV-10). |
| **PII / data privacy** | ✓ PASS | Observations exclude nick/avatar/flags/communication_disabled_until — negative test `ingest.discord.test.ts` "observations carry NO PII"; quarantine persists **digest, not payload** (`disposition.ts` Quarantined). |
| **Injection / code exec** | ✓ PASS | No `eval`/`Function`/`child_process`/`exec` (scan); canonicalization is pure structural walk; no SQL/shell/template surfaces. |
| **Error handling / data loss** | ✓ PASS | Failure taxonomy surfaces `IngestionStoreError` + propagates defects (never swallowed) — `failure-taxonomy` tests; every event terminates in a durable disposition or a loud typed error (INV-1). |
| **Idempotency / integrity** | ✓ PASS | tenant-scoped keys (cross-tenant isolation test); atomic `Ref.modify`; conflict is a distinct terminal; `safeDigest` hardened against `[object Object]` + prefix-truncation collisions (review fix). |
| **Production-use safety** | ✓ PASS | `InMemoryIngestionStoreLayer` fails fast under `NODE_ENV=production` (guard + tests) — mechanically enforces the NON-PRODUCTION label (§17.6). |
| **Dependencies** | ✓ PASS | `effect` only, peerDep pinned `>=3.21.2 <4`; no new external runtime deps; medium-registry untouched. |
| **Evidence integrity** | ⚠ ACCEPTED (Tier-2) | Fail-closed generation via self-attested `--tests-passed`; wave-2 must bind to a CI test-artifact digest + commit SHA. Named in `knownLimitations` + continuation plan. |
| **Transport / auth / signature** | ⚠ ACCEPTED (Tier-2) | No Ed25519 webhook verification, Gateway session-identity, or replay handling this wave — **blocking items before production**, encoded in ADR-durable-ingestion-store + `durable-store-contract.skip.test.ts` + continuation plan + NON-PRODUCTION label. |
| **Conflict recovery** | ⚠ ACCEPTED (Tier-2) | Sticky first-write has no recovery path until the durable store; documented + skipped conformance target. |

## Verdict

No CRITICAL or HIGH security findings in the shipped wave-1 surface. The `⚠ ACCEPTED`
items are **documented Tier-2 deferrals with named enforcement gates** (NON-PRODUCTION
label + ADR + skipped conformance tests + continuation plan) — they are explicitly out of
the wave-1 production surface and cannot be reached in a live path (the production guard
fails fast). Tests/typecheck/build green (387 pass / 5 skip / 0 fail).

APPROVED — LET'S FUCKING GO

<!-- LOA-VERDICT: APPROVED critical=0 high=0 medium=0 accepted_deferred=3 -->
