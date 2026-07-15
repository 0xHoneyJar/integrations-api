# Product Requirements Document — Freeside Integrations (evolution of freeside-mediums)

Status: **candidate** (operator-ratified direction; wave-1 scope)
Cycle: integrations-api-simstim
Date: 2026-07-15
Owner: operator (soju)
Building: `freeside-mediums` / `mediums-api` → evolving into the Freeside **integrations** building
Federation slug (target): `integrations-api`

> Answer sheet: `grimoires/loa/context/freeside-integrations-kit/{claude-cli-prompt.md,architecture.md,reference-implementation/}`.
> The kit is a *candidate input reconciled against current repository truth* — not a spec to copy. See §7 Reconciliation.

---

## 1. Problem & Context

`freeside-mediums` today is a sealed, runtime-free Effect-Schema registry answering one question — *"what can THIS chat medium render?"* — published as `@0xhoneyjar/medium-registry` (`packages/protocol`, v0.2.0) with two sibling packages (`cli-renderer`, `discord-renderer`). It has **little consumer gravity** and is, per the operator decision, **a seed rather than a permanent presentation-only boundary**.

Freeside needs a governed way for **provider behavior** (Discord, Telegram, Luma) to enter the platform through **versioned, evidence-backed contracts** where **every received event has an explainable disposition and the production path persists it durably** — instead of renderers and persona engines each re-deriving provider assumptions ad hoc, and instead of ingestion that can silently drop or silently re-mean events. Wave 1 proves the contract in memory and remains explicitly non-production until the durable-store gate lands.

The operator has **ratified** (do not re-litigate):

- **R1 — Evolutionary direction.** Evolve *this* building into the integrations building. Do **not** create a second `freeside-integrations` repository preemptively.
- **R2 — External identity.** Preferred federation slug `integrations-api`; umbrella domain "integrations"; runtime instance = "connection"; presentation surface = "medium capability".
- **R3 — Compatibility preservation.** `@0xhoneyjar/medium-registry` must remain a valid, source-compatible surface throughout migration.
- **R4 — Meta-harness-and-governance-first ordering.** Build the governance/coverage/evidence/disposition *harness* and its contracts before provider breadth. One provider proves the harness end-to-end.
- **R5 — Bounded Discord-first reference vertical.** Implement only the smallest complete Discord vertical in this wave; Telegram and Luma are an explicit written continuation plan, not code, this cycle.

## 2. Goals

- **G1** — Establish the integrations building's **invariant center**: provider behavior enters through a versioned, evidence-backed contract, and every received event ends `projected | ignored-with-reason | quarantined | duplicate` — **no silent drops**.
- **G2** — Deliver a **reviewable, testable Discord reference vertical** proving all four dispositions plus idempotent duplicate handling and atomic disposition persistence, entirely in-memory (no secrets, no live network) this wave.
- **G3** — Preserve `@0xhoneyjar/medium-registry` as a **compatibility surface** (R3): existing exports, types, and tests remain valid and green; all new contracts are **additive**.
- **G4** — Ship the **governance harness as artifacts**: a classified **coverage report** and an **evidence receipt** for the Discord surface, reviewable in-tree.
- **G5** — Produce an **explicit Telegram + Luma continuation plan** and a named next ratification decision, so wave-2 needs zero re-discovery.

## 3. Success Metrics / Acceptance (wave 1)

The wave is accepted when **all** hold (traceable to §5 / §6):

- **AC-1** — Existing protocol + renderer test **suites** pass with **zero regressions**; no existing coverage removed. (Baseline snapshot 324 tests / 0 fail is informative context, not the gate — the gate is named-suite green + no dropped coverage.) *(IMP-010)*
- **AC-2** — Existing `@0xhoneyjar/medium-registry` imports remain valid; its public API is unchanged (source-compatible).
- **AC-3** — New contracts are **additive**; no breaking shape change to any published descriptor (architect lock A7 preserved).
- **AC-4** — The Discord reference path demonstrably yields **committed**, **duplicate**, **ignored**, and **quarantined** dispositions under test.
- **AC-5** — **Malformed** and **unknown** Discord events cannot disappear — each persists as a `Quarantined` disposition with a reason (and, where applicable, a patch candidate flag).
- **AC-6** — Idempotency registration and disposition persistence are **one atomic store operation**. Tested against (a) the claim-before-persist failure mode and (b) **concurrent** commit of the same key — N parallel commits yield exactly one `Committed` + (N−1) `Duplicate`. *(IMP-004 + skeptic concurrency cluster)*
- **AC-7** — **No secrets or real user payloads** are committed to source or fixtures; connection records hold secret *references*, never secrets; message content is excluded by default.
- **AC-8** — `typecheck`, `test`, `build` are green; `/review-sprint` + `/audit-sprint` pass.
- **AC-9** — A **coverage report** and **evidence receipt** exist at **canonical paths** (§11.6) with required fields, making the artifact objectively checkable in review/CI. *(IMP-007, IMP-008)*
- **AC-10** — The handoff names unresolved provider limitations and the **exact next ratification decision**.

## 4. Users & Stakeholders

| Stakeholder | Interest |
|---|---|
| **freeside-characters / persona-engine** | Consumes presentation capabilities; must not break on this evolution (R3). |
| **freeside-quests / discord-renderer** | Typed source-of-truth for Discord rendering; presentation compat. |
| **loa-finn CLI** | Second-medium proof consumer of the registry. |
| **Identity / member-graph owners (future)** | Consume normalized `Observation`s; own proof-of-identity and cross-source projection — **not** owned here. |
| **Operator / governance** | Owns publish gate, mission-rename ratification, and provider prioritization. |
| **loa-freeside (parent factory)** | Owns the federation registry + ADRs — **out of scope to mutate** this cycle. |

## 5. Functional Requirements

### Protocol & governance harness (R4 — first)

- **FR-1** — Define stable, boundary-crossing **protocol schemas**: provider/integration identifiers, connection metadata + lifecycle state, a raw-event envelope, normalized observations, ingestion dispositions, coverage manifests, and source/evidence receipts. Runtime clients, credentials, and provider payloads MUST NOT leak into shared domain contracts.
- **FR-2** — Define the **ingestion disposition** algebra: `Projected(observations[])`, `Ignored(reason, tier)`, `Quarantined(reason, patchCandidate)`, wrapped by a durable result `Committed(upstreamEventId, disposition) | Duplicate(upstreamEventId)`.
- **FR-3** — Define an **IngestionStore** service whose `commit(envelope, disposition)` performs idempotency registration **and** disposition persistence as one atomic operation, returning `committed | duplicate`.
- **FR-4** — Define an **AdapterRegistry** service: `normalize(envelope) -> Effect<IngestionDisposition, AdapterContractError>`. **Only** the typed `AdapterContractError` (and envelope-decode / unknown-provider routing failures) convert to `Quarantined` (with redacted evidence). **Unexpected defects and store failures do NOT** — they surface as typed errors / propagated defects, never laundered into provider "drift" records. Full taxonomy: §11.3. *(refined per skeptic failure-taxonomy CRITICALs)*
- **FR-5** — Define **coverage** as a *vector* (Discovery, Generation, Behavior, Ingestion, Reconciliation, Lifecycle, Evidence) where each surface entry is Tier-1 (conformance-gated) / Tier-2 (deferred + reason) / Tier-3 (excluded + reason).
- **FR-6** — Define a **source manifest / evidence receipt** shape: authoritative source URL + immutable ref/digest, retrieval timestamp, source class (OpenAPI | event-catalog | docs | changelog | source), generator + version, discovered operations/events, applied patches + owners, and a semantic-focus / source-domain validation result.

### Discord reference vertical (R5)

- **FR-7** — Implement a **Discord adapter** normalizing Tier-1 member/role signals with **defined observation shapes** (§11.4): `GUILD_MEMBER_ADD` → `MembershipObserved`, `GUILD_MEMBER_UPDATE` → `MembershipChanged` (current role set; nick/avatar/flags excluded as PII), `GUILD_MEMBER_REMOVE` → `MembershipRevoked`. Leave-vs-kick-vs-ban is **not** distinguishable from the Gateway REMOVE event — documented limitation. Each has its own acceptance test. *(refined per IMP-005)*
- **FR-8** — **Ignore** classified non-domain events with a reason (e.g. `MESSAGE_CREATE` → Tier-3, message content excluded from the member graph).
- **FR-9** — **Quarantine** unknown Discord event types and malformed/undecodable payloads with a reason; malformed decode → `patchCandidate: true`.
- **FR-10** — Provide an **`ingestEnvelope` orchestration** composing adapter normalization + atomic commit, emitting structured telemetry (span annotations) with **no payload/secret leakage**.
- **FR-11** — Record **Discord source manifests** for REST (`discord/discord-api-spec`) and Gateway (events catalog) as **separate** source classes, with pins + digests, as reviewable evidence (not fetched-at-runtime).
- **FR-12** — Produce a **classified coverage report** for the Discord surface and an **evidence receipt** for the wave-1 slice.

### Compatibility & identity migration (R2, R3)

- **FR-13** — Retain the existing `@0xhoneyjar/medium-registry` package and its exports **unchanged**; document it as the integrations building's **presentation-capability** domain.
- **FR-14** — Additively record the building's evolving identity (integrations-api slug + umbrella naming) in **local** metadata/docs only; do **not** mutate loa-freeside or its federation registry.

### Continuation (R5)

- **FR-15** — Deliver a written **Telegram** plan: governed derivative spec from Bot API docs/changelog/server source + fixtures; webhook vs `getUpdates`, `update_id`, `allowed_updates`, 24h retention window; explicit membership-reconstruction limitations.
- **FR-16** — Deliver a written **Luma** plan: generate from its OpenAPI registry + webhooks; prioritize guest/ticket/subscription/membership/event/attendance edges; default PII minimization (seal/discard email, phone, registration answers, revenue unless a ratified use requires them).

## 6. Invariants (INV — must hold in code & tests)

- **INV-1** — Every `RawEventEnvelope` that reaches `ingestEnvelope` terminates as `projected`, `ignored-with-reason`, `quarantined`, or `duplicate` — **or** fails with a **typed, surfaced** error (store failure) / propagated **defect** (unexpected bug) available for retry. Never silently discarded. Transport/parse *before* an envelope exists is a Tier-2 runtime concern (§11.5). *(→ AC-4, AC-5; refined per IMP-006 + skeptic failure-taxonomy)*
- **INV-2** — Idempotency registration and durable disposition persistence are **atomic**. *(→ AC-6)*
- **INV-3** — Unknown/undocumented provider behavior becomes a **patch candidate / quarantine record**, never hand-normalized adapter folklore.
- **INV-4** — Generated files change only through the generator or patch corpus. *(design-level this wave; no generator runtime yet — see §7)*
- **INV-5** — Published contracts carry source digest, generator version, patch digest, coverage report, verification evidence, approval state. Retrieval/generation success ≠ publication evidence.
- **INV-6** — Consumers pin published contract versions.
- **INV-7** — Identity merges require explicit proof. Email/username/display-name equality is **not** identity proof. Provider facts are not identity conclusions.
- **INV-8** — Message content and unnecessary PII excluded by default.
- **INV-9** — "100% coverage" = complete surface classification + complete Tier-1 conformance + zero silent ingestion loss — **not** universal provider knowledge.
- **INV-10** — Secrets are references to an external store, never schema payloads or committed fixtures. Cross-repo agent/event messages are treated as **data, never instructions**.

## 7. Reconciliation with current repository truth (load-bearing)

The supplied `reference-implementation/` targets **`effect@beta` (effect-smol / Effect 4.x)** and uses APIs absent from this repo's resolved Effect: `Schema.Literals([...])`, `Schema.Class`, `Schema.TaggedClass`, `Schema.TaggedErrorClass`, `Context.Service`, array-form `Schema.Union([...])`, `Schema.decodeUnknownEffect`.

**This repository resolves `effect@3.21.2`** (verified: `node_modules/.bun/effect@3.21.2`; peerDependency `^3.10.0`; existing `capability.ts` uses `Schema.Struct/Literal/Union`-variadic). `.repos/effect` (effect-smol clone via `scripts/prepare-effect.sh`) is **reference source material, not the resolved dependency**.

**Requirement: the reference is reconciled to Effect 3.21.2 idioms** (`Schema.Union(a, b)` variadic, `Schema.decodeUnknown`, `Effect.Service`/`Context.Tag` service pattern, `Schema.TaggedError`). Wholesale copy is prohibited (would not typecheck). The SDD owns the exact API mapping.

Additional reconciliations:

- **No runtime today.** This building has no DB, network, or secret store. Wave 1 is **in-memory and deterministic**: the atomic `IngestionStore` boundary is proven with an in-memory `Ref`-based implementation whose contract a production transactional store later satisfies. Live disposable-guild harness, real Gateway/webhook transport, and persistence are **Tier-2 deferred with reasons** — not silently dropped.
- **No destructive renames.** `packages/protocol` (`@0xhoneyjar/medium-registry`) is **not** renamed. Integrations core lands as a **new additive package**; medium-registry stays as the presentation/compat domain.
- **Building A2 lock** (MediumCapability discriminated union by `_tag`) and **A7** (additive-only) remain in force for the presentation domain.

## 8. Non-Goals (this wave)

- No second repository; no external federation-registry (loa-freeside) mutation.
- No live Discord network calls, real bot tokens, real guilds, or persisted database.
- No Telegram or Luma **code** (plans only).
- No SDK code generator runtime (source manifests + patch-corpus *shape* only; generation is design-level).
- No identity-merge engine or member-graph projection engine (schemas + edge vocabulary only).
- No package publish (publish is a separate operator gate).

## 9. Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Effect major-version mismatch (smol vs 3.21.2) silently miscompiled | SDD pins 3.21.2 API mapping; `/run` typechecks against the real dependency; AC-8 gate. |
| Scope creep toward the full destination topology | R4/R5 bound wave 1 to protocol harness + one in-memory Discord vertical + written continuation. |
| Breaking medium-registry consumers | Additive-only new package; medium-registry untouched; AC-1/AC-2/AC-3 gates. |
| Provider facts drift / hallucinated Discord semantics | Verify against primary sources (Discord api-spec + Gateway docs); source manifests cite pins/digests; INV-3 quarantines the unknown. |
| Committing secrets/PII | INV-8/INV-10; deterministic test placeholders only; audit gate. |
| Flatline API-key readiness stale | Known: providers are headless CLI routes (codex/cursor/grok); run `flatline-orchestrator.sh` directly; degraded mode recorded per voice. |

## 10. Primary sources (verify unstable facts against these)

- Discord API spec — https://github.com/discord/discord-api-spec
- Discord Gateway events — https://docs.discord.com/developers/events/gateway
- Telegram Bot API — https://core.telegram.org/bots/api · server https://github.com/tdlib/telegram-bot-api
- Luma developer index — https://docs.luma.com/llms.txt
- Distilled — https://github.com/alchemy-run/distilled
- Alchemy Effect coverage PR — https://github.com/alchemy-run/alchemy-effect/pull/797
- Cloudflare resource factory — https://v2.alchemy.run/blog/2026-07-02-cloudflare-resource-factory/
- Governance Engineering — https://blog.hosaka.fm/governance-engineering/

---

## 11. Review-hardened contracts (Flatline PRD integration — 2026-07-15)

Three headless voices (codex-headless · cursor/composer-2.5 · grok) adversarially reviewed this PRD: consensus **APPROVED**, confidence **full**, 3/3 voices, `chain_health: ok`, not degraded. Six HIGH-consensus + twelve disputed improvements + the skeptic blocker set converged on the **canonical contracts** below, integrated so the SDD is mechanical. None challenged a ratified decision (R1–R5) or a safety boundary. Evidence: `.run/flatline-evidence/prd-review.json` · `grimoires/loa/a2a/flatline/prd-final_consensus.json` · integration log `.run/flatline-evidence/prd-integration-decision.md`.

### 11.1 Canonical disposition / result model *(IMP-001)*

Two distinct layers — telemetry, coverage, and tests count on **this** table only:

| Layer | Type | Values |
|---|---|---|
| **Disposition** (what the event *means*) | `IngestionDisposition` | `Projected{observations[]}` · `Ignored{reason, tier}` · `Quarantined{reason, patchCandidate}` |
| **Result** (what *persistence* did) | `IngestionResult` | `Committed{upstreamEventId, disposition}` · `Duplicate{upstreamEventId}` |

The four terminal outcomes in G1/INV-1 = `Duplicate` ∪ (`Committed` × {`Projected`, `Ignored`, `Quarantined`}). `Duplicate` returns minimal `{upstreamEventId}` + correlation metadata, **not** the prior full disposition *(IMP-012)*.

### 11.2 Deterministic event identity *(IMP-002 — avg 952, highest-scored finding)*

- **Idempotency key** = `provider ∷ connectionId ∷ upstreamEventId`. Never global; never bare `upstreamEventId`.
- Persist a **canonical payload digest** (sha256 of canonicalized payload) alongside the key.
- **Fallback** when `upstreamEventId` is absent/malformed: synthesize `provider ∷ connectionId ∷ eventType ∷ payloadDigest` — a malformed event is still keyed and dispositioned, never dropped.
- **Same key + different digest ⇒ conflict** → `Quarantined{reason: "id-conflict", patchCandidate: true}`; never silently collapsed as a duplicate (guards replay / corruption).

### 11.3 Failure taxonomy *(skeptic CRITICAL cluster — the load-bearing correctness fix)*

| Failure | Channel | Terminal outcome |
|---|---|---|
| Provider payload fails adapter decode/contract | typed `AdapterContractError` | `Quarantined{malformed-payload, patchCandidate:true}` |
| Envelope itself fails to decode (pre-adapter) | typed | `Quarantined{malformed-envelope}`, **redacted** evidence (digest only) |
| No adapter / unknown provider | typed | `Quarantined{unknown-provider}` |
| Unknown event type, known provider | classified | `Quarantined{unclassified-event, patchCandidate:true}` |
| **Store commit fails** | typed `IngestionStoreError` | ingestion **fails loudly** (retryable) — NOT a drop, NOT a quarantine |
| **Unexpected defect** (bug, invariant break, fiber interrupt) | Effect **defect / die** | surfaced, NOT swallowed as provider quarantine |

The over-broad "catch everything → Quarantined" is prohibited: engineer defects and infrastructure failures must never be laundered into provider "drift" records.

### 11.4 Discord Tier-1 observations + bounded classification *(IMP-005, IMP-013)*

Observation shapes (Tier-1, conformance-gated):

- `GUILD_MEMBER_ADD` → `MembershipObserved{externalAccountId, communityExternalId, roleExternalIds[]}`
- `GUILD_MEMBER_UPDATE` → `MembershipChanged{externalAccountId, communityExternalId, roleExternalIds[]}` (current role set; nick/avatar/flags excluded as PII)
- `GUILD_MEMBER_REMOVE` → `MembershipRevoked{externalAccountId, communityExternalId}` — **limitation**: leave vs kick vs ban not distinguishable from the Gateway event.

Bounded classification table (exactly the wave-1 admitted surface, NOT the whole Gateway):

| Event | Tier | Disposition | reason-code |
|---|---|---|---|
| GUILD_MEMBER_ADD / UPDATE / REMOVE | 1 | Projected | — |
| MESSAGE_CREATE | 3 (excluded) | Ignored | `message-content-excluded` |
| any other known-provider event | — | Quarantined | `unclassified-event` |
| undecodable payload | — | Quarantined | `malformed-payload` |

Reason codes are a small **extensible enum** *(IMP-009)*: `message-content-excluded · unclassified-event · malformed-payload · malformed-envelope · unknown-provider · id-conflict`. Tier (criticality) and disposition (coverage classification) are **separate axes**.

### 11.5 Telemetry / redaction / retention *(IMP-006, IMP-017)*

- **Span/log attribute allowlist**: `provider, connectionId, tenantId, eventType, upstreamEventId, disposition._tag, reasonCode`. NEVER payload, user fields (username / global_name / avatar / communication_disabled_until), or secrets.
- **Quarantine records** persist `{reasonCode, eventType, payloadDigest, patchCandidate}` — **digest, not raw payload** (resolves forensic-vs-PII tension; INV-8 preserved).
- **Fixtures**: deterministic placeholders only; a fixture lint rejects secret-/token-shaped values.
- **Pre-envelope boundary** (Tier-2 deferred, reason: no transport this wave): Gateway/webhook receipt, reconnect/resume/sequence-gap buffering, and parse-before-envelope are runtime concerns; INV-1 is scoped to post-envelope. Named limitation, not a silent gap.

### 11.6 Wave-1 store contract + artifact paths *(IMP-004, IMP-007, IMP-008)*

- Wave-1 `IngestionStore` is an **observable atomic contract** proven with an in-memory `Ref` (linearizable `Ref.modify`). "Durable" wave-1 = atomic + idempotent within-process. Crash-safe / cross-process / DB-transactional persistence is **Tier-2 deferred** (reason: no DB/runtime this wave); a production backend MUST preserve the same observable properties.
- **Canonical artifact paths** (make AC-9 objectively checkable; `<pkg>` = the integrations core package pinned by the SDD):
  - source manifests → `<pkg>/source/discord.rest.source.json`, `<pkg>/source/discord.gateway.source.json`
  - coverage report → `<pkg>/coverage/discord.coverage.json`
  - evidence receipt → `<pkg>/evidence/discord.evidence.json`
  - each carries required FR-6 fields (source class, ref/digest, retrieval ts, generator/version, discovered ops/events, patches+owners, validation result) + approval state.

### 11.7 Continuation definition-of-done *(IMP-014, IMP-018)*

FR-15 (Telegram) / FR-16 (Luma) plans satisfy AC-10 with a short checklist — {source classes + governance derivation · cursor/webhook semantics · membership-reconstruction limitations · PII posture · named next ratification target} — captured in the canonical continuation artifact, not a separate template.
