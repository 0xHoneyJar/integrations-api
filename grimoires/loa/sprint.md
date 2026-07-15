# Sprint Plan — Freeside Integrations wave 1 (Discord reference vertical)

Status: **candidate**
Cycle: integrations-api-simstim
Traces: `grimoires/loa/prd.md` · `grimoires/loa/sdd.md`
Scope: the reviewable first vertical only (R5). All work in `packages/integrations-core` (new, additive). `@0xhoneyjar/medium-registry` untouched.

Ordering follows R4 (meta-harness-and-governance-first): protocol + identity + failure-harness land before provider breadth; the Discord adapter proves the harness; governance artifacts + compat close it. Five bounded, independently-green sprints → one consolidated PR via `/run sprint-plan`.

Definition of green (every sprint boundary): `bun run typecheck` + `bun test packages` + `bun run build` all pass; no regression to the 324 existing tests.

---

## Sprint 1: Protocol + identity foundation (governance-first)

**Goal**: scaffold the new package wired into the workspace, land the protocol schemas + event-identity + typed errors. No adapter, no store yet.

| Task | Detail | Acceptance |
|---|---|---|
| S1-T1 | Scaffold `packages/integrations-core`: `package.json` (`@0xhoneyjar/integrations-core`, `private:true`, `type:module`, peerDep `effect >=3.21.2 <4` + matching devDep §17.5, scripts build/typecheck/test/clean), `tsconfig.json` (composite, extends root). Register in root `package.json` workspaces + root `tsconfig.json` references. | `bun install` clean; `bun run typecheck` includes the new pkg (0 errors); peer range = proven Effect version. |
| S1-T2 | `src/protocol/{provider,envelope,observation,disposition,result,coverage,source}.ts` + `index.ts` barrel — SDD §4 schemas in **Effect 3.21.2** idioms (SDD §2 mapping). ReasonCode + Tier enums. | Schema round-trip decode/encode tests pass for each type; `MembershipObserved/Changed/Revoked` union decodes. |
| S1-T3 | `src/identity.ts` — `canonicalDigest` (canonicalization contract §16.9: JSON-only, recursively sorted keys, reject non-serializable) + `idempotencyKey` = `tenantId:provider:connectionId:upstreamEventId` (§16.1) returning `null` when upstream id absent (§16.2, NO content-fallback). | `test/identity.test.ts`: **key includes tenantId**; two tenants same connectionId → distinct keys; absent id → null; digest deterministic + key-order-independent; non-serializable rejected. |
| S1-T4 | `src/errors.ts` — `AdapterContractError`, `IngestionStoreError` (`Schema.TaggedError`). | typecheck; errors are Schema + Error. |
| S1-T5 | Envelope constraints (§16.10): identifiers `Schema.NonEmptyString`, digests sha256-hex pattern; `Tier` defined once in `protocol/disposition.ts` and imported by `coverage.ts`. ReasonCode enum incl. `missing-event-id`, `hash-mismatch`. | schema rejects empty ids / malformed digest; single Tier symbol. |

**Verification**: `test/identity.test.ts` green; schema tests green; typecheck/build green; 324 existing tests still pass (AC-1, AC-3). Traces INV-2, §11.2.

## Sprint 2: Ingestion harness + failure taxonomy

**Goal**: the atomic store + orchestration + telemetry — the correctness spine (AD-4). Proven with a trivial stub adapter (Discord lands S3).

| Task | Detail | Acceptance |
|---|---|---|
| S2-T1 | `src/services.ts` — `IngestionStore` `Context.Tag` with **two atomic methods** `commit(...)` + `quarantine(record)` (quarantine-record identity `quarantine:tenant:provider:conn:safeDigest`, separate from event keys §17.2); provider-keyed `AdapterRegistry` (§16.8, temp discord-only registry composed in S3 — S2 uses a stub adapter); `InMemoryIngestionStoreLayer` via `Ref.modify` returning `committed \| duplicate \| conflict`; conflict does NOT overwrite (first disposition **sticky** §16.4). | store unit tests: insert→committed; same key+digest→duplicate; same key+diff digest→conflict + original retained; poison-pill sticky (documented intentional §17.6); quarantine records don't collide with event keys. |
| S2-T5 | `ingestUnknown(input)` = **SOLE public export** (§17.4; `ingestEnvelope` internal, NOT exported from `index.ts`): decode envelope, `ParseError`→`malformed-envelope` quarantine (safe-derived digest §17.8, via `store.quarantine`); provider-dispatch miss→`unknown-provider` (§16.8); `rawPayloadHash` present+≠computed→`hash-mismatch` quarantine (§16.7); absent id→`missing-event-id` quarantine (§16.2); conflict→distinct `Conflict` result (§16.3). | tests: **all disposition paths route through `ingestUnknown`**; `index.ts` does not export `ingestEnvelope`; telegram/luma envelope vs discord-only→unknown-provider; malformed→durable quarantine; hash mismatch→quarantine; store-state inspected after commit/duplicate/conflict. |
| S2-T2 | `src/telemetry.ts` — `annotateAllowlisted` span helper; attribute allowlist only (SDD §10, PRD §11.5). | test: annotation carries only allowlisted keys; never payload/PII. |
| S2-T3 | `src/ingest.ts` — `ingestEnvelope` (SDD §6.3 + §16): only `AdapterContractError`→Quarantined; store error surfaces; defect propagates; conflict→distinct `Conflict` result (§16.3, NOT Committed); duplicate→Duplicate; telemetry ordering §16.11 (identity before normalize, disposition after). | `test/failure-taxonomy.test.ts`: store-failure surfaces `IngestionStoreError`; injected defect NOT swallowed; conflict is `Conflict` not `Committed`. |
| S2-T4 | Concurrency proof: N parallel `ingestEnvelope` of one key via `Effect.all({concurrency})`. | exactly 1 `Committed` + (N−1) `Duplicate` (AC-6, INV-2). |

**Verification**: failure-taxonomy + concurrency + store tests green; typecheck/build green. Traces AC-6, INV-1, INV-2, §11.3.

## Sprint 3: Discord reference adapter

**Goal**: the provider vertical proving all four dispositions through the real Discord adapter (SDD §7, PRD §11.4).

| Task | Detail | Acceptance |
|---|---|---|
| S3-T1 | `src/providers/discord.ts` — decode `DiscordMember` via Schema; `GUILD_MEMBER_ADD→MembershipObserved`, `UPDATE→MembershipChanged`, `REMOVE→MembershipRevoked` (roles omitted); `MESSAGE_CREATE→Ignored{message-content-excluded,tier-3}`; unknown known-provider event→`Quarantined{unclassified-event}`; SchemaError→`AdapterContractError`. `DiscordAdapterRegistryLayer`. | adapter unit tests per event type. |
| S3-T2 | `test/ingest.discord.test.ts` — end-to-end through `ingestEnvelope` + Discord layer + in-memory store: **committed** (ADD/UPDATE/REMOVE), **ignored** (MESSAGE_CREATE), **quarantined** (unknown event + malformed payload→malformed-payload), **duplicate** (re-deliver). Deterministic fixtures only. | all four disposition classes + duplicate proven; malformed cannot disappear (AC-4, AC-5). |
| S3-T3 | In-code classification table + leave/kick/ban limitation comment; PII fields excluded. **`upstreamEventId` documented as transport-assigned delivery id (§17.1), NOT extracted from Discord payload**; fixtures supply delivery ids representing runtime assignment. | reviewer-visible; no nick/avatar/PII in observations; delivery-id semantics documented. |

**Verification**: full disposition matrix green; fixtures carry no secrets/PII (AC-7); typecheck/build green. Traces FR-7/8/9, AC-4, AC-5, §11.4.

## Sprint 4: Governance artifacts (coverage + evidence)

**Goal**: the governance harness as reviewable artifacts (R4, SDD §8, PRD §11.6).

| Task | Detail | Acceptance |
|---|---|---|
| S4-T1 | `source/discord.rest.source.json` + `source/discord.gateway.source.json` — SDD §8 fields, pinned refs (`discord/discord-api-spec` `specs/openapi.json`+`_preview.json`; Gateway docs URL snapshot), source class, validation result. **Verified facts only** (SDD §7). | files parse; required fields present; digests present. |
| S4-T2 | `scripts/build-coverage.ts` — derive `coverage/discord.coverage.json` (7-dimension vector, per-event Tier) + `evidence/discord.evidence.json` (contract version, sourceRefs, coverageRef, static results, `liveResults:"tier-2-deferred"`, knownLimitations[] incl. sticky-conflict + pre-envelope transport, `approvalState:"unpublished"`) from the classification table + a **machine-readable test-outcome file**; **FAILS CLOSED** if tests failed (§16.11). | script runs; fails closed on red tests; artifacts at canonical paths. |
| S4-T3 | `test/coverage.test.ts` — validate artifacts against an **Effect schema** (semantic invariants, §16.11), not mere existence: required fields, every admitted event classified Tier-1/2/3 with reason, knownLimitations present. | AC-9 objectively + semantically checkable in CI. |

| S4-T4 | Durable-store ADR (§17.6): `grimoires/loa/decisions/ADR-durable-ingestion-store.md` — future atomic compare-and-set store contract (restart, multi-instance dedup, conflict recovery: admin rekey / supersede-with-audit / tombstone). Skipped contract-test stub `test/durable-store-contract.skip.test.ts` encoding required durable semantics. Evidence receipt `knownLimitations` includes NON-PRODUCTION spine + sticky-conflict + pre-envelope transport. | ADR present; stub skipped (not failing the suite); evidence labels spine NON-PRODUCTION. |

**Verification**: artifacts exist at canonical paths with required fields; coverage test green; ADR + skipped stub present. Traces FR-5, FR-6, FR-11, FR-12, AC-9, INV-5, §17.6.

## Sprint 5: Compatibility, identity migration, continuation plan

**Goal**: prove compat, record additive identity, and land the Telegram/Luma continuation (AC-2, AC-10, FR-13/14/15/16).

| Task | Detail | Acceptance |
|---|---|---|
| S5-T1 | `test/compat.test.ts` — import `@0xhoneyjar/medium-registry` public API (`MEDIUM_REGISTRY_VERSION`, `MediumCapability`, `DISCORD_WEBHOOK_DESCRIPTOR`) and assert resolves; assert medium-registry `package.json` version unchanged. | AC-2, AC-3 green; medium-registry untouched. |
| S5-T2 | Rewrite the root/package governance docs for the `integrations-api` evolution and ratify a local BeaconV3 source + `.well-known/beacon.json` projection. Preserve medium-registry as the presentation domain; do not mutate the external `loa-freeside` registry or claim the GitHub rename landed. | Beacon validates against current canon; no placeholder seals/fabricated Tag refs; local-only (FR-14). |
| S5-T3 | `grimoires/loa/context/integrations-continuation-plan.md` — Telegram + Luma design (SDD §13) with DoD checklist (PRD §11.7) + **named next ratification decision**. Also names the wave-2 blocking items: **transport/trust boundary** (who may call ingest; envelope identity authenticated above the boundary §17.3), **Discord durable-identity strategy** (Gateway session/sequence + reconnect/replay §17.1), and the **security checklist** (Ed25519 signed-interaction verification, clock-skew tolerance, replay window §17.7). | AC-10 satisfied; trust/identity/security continuation items named; zero re-discovery. |
| S5-T4 | Final consolidation: `bun run typecheck` + `bun test packages` + `bun run build` full green; fixture/secret lint clean. | whole-workspace green; AC-1, AC-7, AC-8. |

**Verification**: compat + full-suite green; continuation doc present; identity note additive. Traces AC-2, AC-8, AC-10, FR-13/14/15/16.

---

## Risk register (sprint-level)

| Risk | Sprint | Mitigation |
|---|---|---|
| Effect 3.21.2 API drift from SDD §2 mapping | S1–S3 | `/implement` typechecks against real dep; fix at first typecheck. |
| `Ref.modify` concurrency assumption wrong | S2 | S2-T4 explicit parallel proof; if it fails, escalate (unlikely — Ref.modify is atomic in Effect). |
| Coverage artifact drift from classification table | S4 | build-coverage derives from the single classification table; coverage.test asserts. |
| Accidental medium-registry edit | all | S5-T1 asserts version unchanged; audit gate; additive-only lock AD-1. |

## Out of scope (mirrors PRD §8 / SDD §14)

No live network/tokens/guild, no DB, no Telegram/Luma code, no generator runtime, no identity-merge engine, no publish, no second repo, no loa-freeside mutation.
