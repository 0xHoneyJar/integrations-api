# Final acceptance review — integrations-api wave 1

Date: 2026-07-15

Scope: post-simstim full-diff reconciliation on `feat/integrations-api-simstim`

Reviewer: primary engineering agent, after consolidated Flatline implementation review and security audit

## Verdict

**APPROVED as a non-production candidate.** The meta harness, governance artifacts, compatibility surface, Beacon identity, and Discord reference vertical are coherent and verified. Production and publication remain blocked by the durable-store, transport/security, replay/reconciliation, and CI-evidence gates.

## Acceptance findings closed

| Severity | Finding | Resolution |
|---|---|---|
| Critical | Simstim preserved the old `mediums-api` presentation-only Beacon despite the operator asking for `integrations-api` + BEACON | Replaced it with a current-canon BeaconV3 source, generated `.well-known/beacon.json`, added a drift/proof-path test, and rewrote project governance |
| High | Discord source manifests described pins but carried neither immutable REST ref nor content digests | Pinned the official OpenAPI document to commit `c9423c8bf43f5fb9d1d63a6c37a316302bbc1a84`; recorded stable REST and Gateway snapshot SHA-256 digests; made digest/timestamp schema-required |
| High | `safeDigest` truncated after 64 KiB, so same-length inputs sharing a prefix could collide | Hash the complete representation; added oversized shared-prefix and hostile-proxy regression tests |
| High | Plain `bun test` discovered the imported Effect 4 reference kit and failed on `@effect/vitest` | Added an explicit Bun test-discovery exclusion for the imported reference kit; the repository default now runs only live package tests |
| Medium | Root README and project kernel overstated durability and still centered the old building | Rewrote both around the non-production integrations boundary, compatibility packages, Freeside seams, and production gates |
| Medium | Updated Loa rejected the old NOTES shape | Added required structured-memory sections and recorded the wave-1 decisions and blockers |
| Medium | Initial Beacon used the ACVP `event_completeness` vocabulary without a cluster `eventsPin` | Removed the false envelope-bound claim; kept proven ingestion guarantees as construct-local idempotency/state-machine invariants |

## Verification fence

- `bun test` — **392 pass / 5 intentional skip / 0 fail** across 16 files.
- `bun run typecheck` — 4/4 packages green.
- `bun run build` — 4/4 packages green.
- `bun run beacon:verify` — 3/3 Beacon drift and proof-path checks green.
- Current `loa-freeside` BeaconV3 generator — source validated and JSON projection generated.
- Coverage generator without test attestation — exits non-zero (fail-closed).
- Coverage generator with `--tests-passed` — regenerates byte-stable coverage/evidence artifacts.
- `.claude/scripts/check-loa.sh` — all checks passed, strict config and integrity verified at Loa `1.196.0`.
- `.claude/scripts/loa-doctor.sh` — framework/project gates green; Beads reports one recoverable missing merge-anchor warning while DB/JSONL counts and hashes agree.

## Remaining gates (not defects hidden by approval)

1. Transactional, crash-safe, cross-process `IngestionStore` and conflict recovery.
2. Authenticated Discord transport, delivery identity, Gateway replay/sequence reconciliation, and Ed25519 verification where applicable.
3. CI-bound evidence receipt containing commit and test-artifact digests.
4. Ratified sibling Tag ABI before any Beacon `composes_with` claim.
5. Separate `loa-freeside` registry migration and GitHub repository rename.
