# integrations-api — Agent Working Memory (NOTES.md)

> This file persists agent context across sessions and compaction cycles.
> Updated by agents during cycle work. Manual edits are preserved.

## Cell metadata

| Field | Value |
|-------|-------|
| Cell | Freeside integrations (local BeaconV3 slug: `integrations-api`) |
| Layer | Provider-ingress contract + preserved presentation compatibility surfaces |
| Federation role | Normalizes external provider events into privacy-bounded Freeside observations |
| Packages | `integrations-core` (private candidate) · `medium-registry` 0.2.0 · both renderers 0.1.0 |
| Architect locks | Sole ingest boundary · zero silent drops · tenant-scoped identity · sticky first write · fail-closed evidence |
| Beacon | `packages/protocol/beacon.yaml` + `.well-known/beacon.json`; external registry migration not yet ratified |
| Loa mount | 2026-05-25 — cluster-meta/loa-mount-2026-05-25 (per ADR-009 D-4) |

## Current Focus

| Field | Value |
|-------|-------|
| Active Task | Close the integrations-api comprehensive simstim cycle |
| Status | Wave 1 built and audited locally; final governance/BEACON reconciliation in progress |
| Blocked By | Production is blocked on durable storage, transport trust, replay, and evidence binding |
| Next Action | Keep integrations-core private; ratify the durable IngestionStore before transport/deployment |
| Previous Cycle | Cycle R presentation packages remain preserved and compatibility-tested |

## Active Sub-Goals

- Keep `@0xhoneyjar/integrations-core` private until the durable-store conformance suite is green.
- Ratify a typed sibling port before adding any Beacon `composes_with` entry.
- Coordinate the `loa-freeside` registry and GitHub repository rename as a separate cross-repo change.

## Discovered Technical Debt

- The in-memory store is not crash-safe or cross-process; five conformance tests remain intentionally skipped.
- Discord transport identity, Gateway replay/reconciliation, and webhook signature verification are unbuilt.
- Evidence generation is self-attested and must bind to CI artifact and commit digests in wave 2.

## Blockers & Dependencies

- Production readiness depends on the durable-store ADR implementation and transport/security gates.
- Federation publication depends on acceptance of the local `integrations-api` identity by `loa-freeside`.

## Decision Log

### 2026-07-15 — Evolve the building without breaking presentation consumers

- Decision: add `@0xhoneyjar/integrations-core`; preserve the three existing presentation packages.
- Rationale: the operator requested an integrations building, while existing package consumers require additive compatibility.
- Evidence: `packages/integrations-core/tests/compat.test.ts`; full workspace suite is green.
- Scenarios: new Discord ingestion, legacy descriptor imports, malformed/unknown events.

### 2026-07-15 — Ratify local Beacon identity, defer external registry mutation

- Decision: publish a canon-validated local BeaconV3 as `integrations-api` with empty `composes_with` and no placeholder seals.
- Rationale: a truthful Beacon is required now; sibling Tag ABIs and the parent registry have not been ratified.
- Evidence: `packages/protocol/tests/beacon.test.ts`; current `loa-freeside` BeaconV3 generator validates the projection.
- Scenarios: source/projection drift, fabricated composition, missing ACVP proof path.

### 2026-07-15 — Keep the ingestion spine non-production

- Decision: retain `private: true` and the production fail-fast guard until durable persistence and transport gates land.
- Rationale: process-local atomicity is not durability.
- Evidence: `packages/integrations-core/tests/guards.test.ts` and `durable-store-contract.skip.test.ts`.
- Scenarios: test/sandbox use, accidental production wiring, future transactional implementation.

## Cross-cell context (orientation only)

- `freeside-characters/persona-engine` — composer + deliver layer; conditions output on current medium's capabilities. Primary consumer.
- `freeside-quests/discord-renderer` — typed source-of-truth for Discord slash-command + interaction renderer. Uses `DISCORD_INTERACTION_DESCRIPTOR`.
- `loa-finn` CLI — second-medium proof for the schema; substrate-fixture rendering. Uses `cli-renderer`.
- `freeside-protocol` (`@0xhoneyjar/asset-pipeline` cycle B) — sibling sealed schema; sprint-4 will add `medium_capabilities?` additive bump that coordinates with this cell.
- Parent factory: `loa-freeside` — platform/network firewall + ADR registry.

## Outstanding co-ordination

- **Registry migration** — replace/alias the `mediums-api` entry in `loa-freeside` only after this branch is reviewed.
- **Repository rename** — the remote is still `0xHoneyJar/freeside-mediums`; coordinate links and consumers before renaming.
- **Production spine** — implement the durable store, authenticated transport, replay/reconciliation, and CI-bound evidence.

## Session Log

### 2026-05-25 — Loa harness mount

- Mount executed via cluster-meta remediation cycle per ADR-009 D-4 doctrine.
- Branch: `cluster-meta/loa-mount-2026-05-25` (off `main` @ `10a7f69`).
- Mount mechanism: Path B (manual scaffold + selective copy from `score-api/.claude/` template — `os-mounting` skill was not available locally).
- `.claude/` size after mount: ~9.2M (substantive; matches score-api + inventory-api precedent).
- `.beads/` initialized via `br init --prefix mediums-api`.
- `grimoires/loa/{cycles,notes,memory}` + `observations.jsonl` + `.run/.gitkeep` scaffolded empty (ready for first cycle).
- **No `src/` or `packages/*/` files were modified.** No npm/bun packages installed/changed. No tracked config (`package.json`, `tsconfig.json`, `bunfig.toml`, `bun.lock`, `README.md`, `.gitignore`) was touched.
- Pending operator GO: push, open PR, merge.

### 2026-07-15 — Freeside Integrations wave 1 (integrations-api-simstim cycle)

Evolving `freeside-mediums` → the Freeside **integrations** building (operator-ratified: evolutionary direction, `integrations-api` slug, compat preservation, meta-harness-and-governance-first, Discord-first reference vertical). Answer sheet: `grimoires/loa/context/freeside-integrations-kit/`.

**Planning (simstim `simstim-20260715-9f1ef8a0`)** — PRD + SDD + sprint authored, each passed a 3-voice headless Flatline review (codex-headless · cursor/composer-2.5 · grok — all APPROVED, chain_health ok, no degraded mode):
- **PRD flatline**: 6 HIGH / 12 disputed / 18 blockers → all integrated as PRD §11 (canonical disposition/result model, deterministic event identity, failure taxonomy, bounded classification, redaction contract, artifact paths).
- **SDD flatline**: 14 disputed / 14 blockers → SDD §16 (tenantId in idempotency key, Conflict as distinct terminal, ingestUnknown boundary, rawPayloadHash verify, provider-dispatch, canonicalization contract).
- **Sprint flatline**: 14 disputed / 14 blockers → SDD §17 (upstreamEventId = transport-assigned delivery id — Discord Gateway has NO durable per-event id, verified vs primary source; quarantine-record identity; trust boundary MUST; NON-PRODUCTION spine DoD; Ed25519 security continuation).

**Key reconciliation**: repo resolves `effect@3.21.2` (NOT the smol/4.x beta the kit's reference-implementation targets) — reference reconciled to 3.21.2 idioms, never copied. Baseline green pre-cycle: typecheck 3/3, tests 324/0, build 3/3.

**Design**: new additive package `@0xhoneyjar/integrations-core` (in-memory, deterministic, no secrets/network this wave); `@0xhoneyjar/medium-registry` untouched (compat = presentation domain). 5 bounded sprints (beads `mediums-api-sprint-1..5`). Telegram/Luma = written continuation only.

Flatline route evidence + integration decisions: `.run/flatline-evidence/`.

**Implementation (5 sprints, consolidated `/run sprint-plan` mode)** — all COMPLETE + green:
- New package `@0xhoneyjar/integrations-core` (private, NON-PRODUCTION, in-memory, offline).
- typecheck 4/4 · build 4/4 · **392 pass / 5 skip / 0 fail** (324 baseline preserved).
- Multi-model **code review** on the impl diff → review→fix loop (safeDigest collision hardening + `NODE_ENV=production` fail-fast guard on the in-memory store).
- Security **audit APPROVED** (0 critical/high; 3 documented Tier-2 deferrals) — `a2a/sprint-plan/auditor-consolidated.md`.
- 7 commits `3dca8ae`→`f51c215`; beads `mediums-api-sprint-1..5` closed; COMPLETED markers written.
- **Governed handoff**: `grimoires/loa/context/wave-1-handoff.md`. Next ratification decision = the **publish gate** (keep private until durable store, recommended).
- **Push/PR pending operator GO** (keep-in-repo directive) — branch `feat/integrations-api-simstim` ready.

## Session Continuity
- Wave-1 done locally. To ship: operator GO → push + draft PR. Wave-2 starts from `integrations-continuation-plan.md` (durable store first).
