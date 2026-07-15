# Software Design Document — Freeside Integrations wave 1 (Discord reference vertical)

Status: **candidate**
Cycle: integrations-api-simstim
Date: 2026-07-15
Traces: `grimoires/loa/prd.md` (esp. §11 review-hardened contracts)
Answer sheet: `grimoires/loa/context/freeside-integrations-kit/architecture.md` (reconciled, not copied)

---

## 1. Design summary

Add a **new additive package** `@0xhoneyjar/integrations-core` (`packages/integrations-core`) that houses the integrations building's protocol contracts + in-memory ingestion harness + Discord reference adapter. `@0xhoneyjar/medium-registry` (`packages/protocol`) and the two renderer packages are **untouched** and remain the **presentation-capability** domain (R3, AC-2). No destructive rename (prompt "Forbidden"). Wave-1 package is `private: true` (publish is a separate operator gate, §12 governance loop).

Everything is **in-memory, deterministic, and offline** this wave — no DB, no network, no secrets (R5, §7 PRD reconciliation). The atomic `IngestionStore` is proven via `Ref.modify` linearizability; a production transactional backend later satisfies the same observable contract (PRD §11.6).

```
packages/
  protocol/           @0xhoneyjar/medium-registry  (UNTOUCHED — presentation domain, compat surface)
  cli-renderer/       @0xhoneyjar/cli-renderer      (UNTOUCHED)
  discord-renderer/   @0xhoneyjar/discord-renderer  (UNTOUCHED)
  integrations-core/  @0xhoneyjar/integrations-core (NEW — this wave)
```

## 2. Effect version reconciliation (load-bearing — PRD §7)

The repo resolves **`effect@3.21.2`** (verified `node_modules/.bun/effect@3.21.2`; peerDep `^3.10.0`). The kit's `reference-implementation/` targets `effect@beta` (effect-smol / 4.x). The reference is **reconciled, never copied**. API mapping (verified against installed `dist/dts/{Schema,Effect,Context}.d.ts`):

| Reference (effect-smol / 4.x) | This repo (effect 3.21.2) |
|---|---|
| `Schema.Literals([...])` | `Schema.Literal(...)` (variadic) |
| `Schema.Union([A, B])` | `Schema.Union(A, B)` (variadic) |
| `Schema.TaggedClass<T>()("Tag", {…})` | **same** — exists in 3.21.2 ✓ |
| `Schema.Class<T>("Name")({…})` | `Schema.Class<T>("Name")({…})` ✓ (used for `RawEventEnvelope`) |
| `Schema.TaggedErrorClass<T>()("Tag", {…})` | `Schema.TaggedError<T>()("Tag", {…})` |
| `Context.Service<Self, Shape>()("id")` | `Context.Tag("id")<Self, Shape>()` |
| `Schema.decodeUnknownEffect(S)` | `Schema.decodeUnknown(S)` |
| `Schema.Defect()` | `Schema.Defect` |
| `Effect.fn("name")(function*…)` | **same** — exists in 3.21.2 ✓ |
| `Ref.make` / `Ref.modify` / `Layer.effect` / `Layer.succeed` | **same** ✓ |

The `/implement` gate typechecks against the real dependency (AC-8); any residual API drift is fixed there.

## 3. Package layout

```
packages/integrations-core/
  package.json            @0xhoneyjar/integrations-core, private:true, peerDep effect ^3.10.0, type:module
  tsconfig.json           composite; extends root; references none (leaf)
  src/
    protocol/
      provider.ts         Provider literal union + identifiers
      envelope.ts         RawEventEnvelope (Schema.Class)
      observation.ts      MembershipObserved / MembershipChanged / MembershipRevoked + Observation union
      disposition.ts      Projected / Ignored / Quarantined + IngestionDisposition; reason-code enum; Tier
      result.ts           Committed / Duplicate + IngestionResult
      coverage.ts         CoverageManifest + CoverageDimension + Tier
      source.ts           SourceManifest + EvidenceReceipt shapes
      index.ts            barrel (protocol public surface)
    identity.ts           idempotencyKey() + canonicalDigest()  (PRD §11.2)
    errors.ts             AdapterContractError · IngestionStoreError (Schema.TaggedError)
    services.ts           AdapterRegistry (Context.Tag) · IngestionStore (Context.Tag) · InMemoryIngestionStoreLayer
    ingest.ts             ingestEnvelope orchestration (failure taxonomy §11.3)
    providers/
      discord.ts          Discord adapter + classification table + DiscordAdapterRegistryLayer
    telemetry.ts          span attribute allowlist (PRD §11.5)
    index.ts              package barrel
  source/                 discord.rest.source.json · discord.gateway.source.json  (governance evidence)
  coverage/               discord.coverage.json
  evidence/               discord.evidence.json
  scripts/
    build-coverage.ts     derive coverage/evidence from the classification table + test results
  test/
    identity.test.ts      key composition, digest determinism, id-conflict
    ingest.discord.test.ts committed/duplicate/ignored/quarantined + malformed + unknown + concurrency
    failure-taxonomy.test.ts store-failure surfaces; defect not swallowed
    coverage.test.ts      artifacts exist at canonical paths + required fields
    compat.test.ts        medium-registry import still valid
```

## 4. Protocol schemas (Effect 3.21.2)

### 4.1 Provider + envelope

```ts
// provider.ts
export const Provider = Schema.Literal("discord", "telegram", "luma")
export type Provider = typeof Provider.Type

// envelope.ts
export class RawEventEnvelope extends Schema.Class<RawEventEnvelope>("RawEventEnvelope")({
  provider: Provider,
  connectionId: Schema.String,
  tenantId: Schema.String,
  eventType: Schema.String,
  upstreamEventId: Schema.optional(Schema.String), // may be absent → fallback key (§11.2)
  observedAt: Schema.String,
  receivedAt: Schema.String,
  sourceContractVersion: Schema.String,
  rawPayloadHash: Schema.String,
  payload: Schema.Unknown
}) {}
```

### 4.2 Observations (Tier-1 domain facts) — PRD §11.4

Each carries the universal metadata envelope (IMP-015): provider, connectionId, tenantId, upstreamEventId, observedAt. Tagged classes:

```ts
export class MembershipObserved extends Schema.TaggedClass<MembershipObserved>()("MembershipObserved", {
  ...ObservationMeta,           // provider, connectionId, tenantId, upstreamEventId, observedAt
  externalAccountId: Schema.String,       // "discord:<user.id>"
  communityExternalId: Schema.String,     // "discord:guild:<guild_id>"
  roleExternalIds: Schema.Array(Schema.String)
}) {}
export class MembershipChanged extends Schema.TaggedClass<MembershipChanged>()("MembershipChanged", { ...same shape... }) {}
export class MembershipRevoked extends Schema.TaggedClass<MembershipRevoked>()("MembershipRevoked", {
  ...ObservationMeta, externalAccountId, communityExternalId   // no roles on remove
}) {}
export const Observation = Schema.Union(MembershipObserved, MembershipChanged, MembershipRevoked)
```

`nick`, `avatar`, `communication_disabled_until`, `pending` are **excluded** (PII, INV-8). Leave-vs-kick-vs-ban indistinguishable on REMOVE — documented in-code + coverage.

### 4.3 Disposition + reason codes — PRD §11.1, §11.3, §11.4

```ts
export const ReasonCode = Schema.Literal(
  "message-content-excluded", "unclassified-event", "malformed-payload",
  "malformed-envelope", "unknown-provider", "id-conflict"
)
export const Tier = Schema.Literal("tier-1", "tier-2", "tier-3")

export class Projected   extends Schema.TaggedClass<Projected>()("Projected", { observations: Schema.Array(Observation) }) {}
export class Ignored     extends Schema.TaggedClass<Ignored>()("Ignored", { reason: ReasonCode, classification: Tier }) {}
export class Quarantined extends Schema.TaggedClass<Quarantined>()("Quarantined", {
  reason: ReasonCode, patchCandidate: Schema.Boolean, payloadDigest: Schema.String, eventType: Schema.String
}) {}
export const IngestionDisposition = Schema.Union(Projected, Ignored, Quarantined)
```

Quarantine persists **digest, not payload** (PRD §11.5 forensic-vs-PII resolution).

### 4.4 Result — PRD §11.1

```ts
// Field carries the composite idempotency KEY (+ optional raw upstreamEventId) — §16.5.
// Conflict is a DISTINCT terminal, never Committed — §16.3.
export class Committed extends Schema.TaggedClass<Committed>()("Committed", {
  idempotencyKey: Schema.String, upstreamEventId: Schema.optional(Schema.String),
  disposition: IngestionDisposition
}) {}
export class Duplicate extends Schema.TaggedClass<Duplicate>()("Duplicate", {
  idempotencyKey: Schema.String, upstreamEventId: Schema.optional(Schema.String)
}) {}
export class Conflict extends Schema.TaggedClass<Conflict>()("Conflict", {
  idempotencyKey: Schema.String, priorDigest: Schema.String, newDigest: Schema.String
}) {}
export const IngestionResult = Schema.Union(Committed, Duplicate, Conflict)
```

## 5. Event identity — PRD §11.2

```ts
// identity.ts — canonicalization contract §16.9; tenant-scoped key §16.1
export const canonicalDigest = (payload: unknown): string =>
  createHash("sha256").update(stableStringify(payload)).digest("hex")   // node:crypto (bun runtime)
// stableStringify: JSON values only, recursively sorted keys, arrays order-preserved.
// Non-serializable (circular/bigint/function/undefined) → throws → caller quarantines (malformed).

// Key INCLUDES tenantId (connectionId NOT assumed globally unique — §16.1).
// Returns null when upstreamEventId absent/empty → caller quarantines missing-event-id (§16.2).
export const idempotencyKey = (e: RawEventEnvelope): string | null =>
  (e.upstreamEventId && e.upstreamEventId.length > 0)
    ? `${e.tenantId}:${e.provider}:${e.connectionId}:${e.upstreamEventId}`
    : null   // NO content-fallback — synthesizing a digest key risks collapsing distinct events
```

**Same key + different digest ⇒ `Conflict` terminal** (§16.3, not a Committed). First disposition is sticky (§16.4).

## 6. Services (Context.Tag) + failure taxonomy

### 6.1 Errors

```ts
// errors.ts
export class AdapterContractError extends Schema.TaggedError<AdapterContractError>()("AdapterContractError",
  { provider: Schema.String, eventType: Schema.String, reason: Schema.String }) {}
export class IngestionStoreError extends Schema.TaggedError<IngestionStoreError>()("IngestionStoreError",
  { operation: Schema.String, cause: Schema.Defect }) {}
```

### 6.2 AdapterRegistry + IngestionStore

```ts
// services.ts
export class AdapterRegistry extends Context.Tag("integrations/AdapterRegistry")<AdapterRegistry, {
  readonly normalize: (e: RawEventEnvelope) => Effect.Effect<IngestionDisposition, AdapterContractError>
}>() {}

export type CommitStatus = "committed" | "duplicate" | "conflict"
export class IngestionStore extends Context.Tag("integrations/IngestionStore")<IngestionStore, {
  readonly commit: (e: RawEventEnvelope, key: string, digest: string, d: IngestionDisposition)
    => Effect.Effect<CommitStatus, IngestionStoreError>
}>() {}
```

`InMemoryIngestionStoreLayer` (`Layer.effect`, `Ref<{ keys: Map<key,digest>, records }>`): `Ref.modify` atomically — if key absent → insert, `committed`; if key present + same digest → `duplicate`; if key present + different digest → `conflict` (§11.2). `Ref.modify` gives linearizable single-op semantics ⇒ AC-6 concurrency holds.

### 6.3 ingestEnvelope orchestration — PRD §11.3 (the load-bearing correctness path)

```ts
export const ingestEnvelope = Effect.fn("Integrations.ingestEnvelope")(function*(e: RawEventEnvelope) {
  yield* annotateAllowlisted(e)                       // telemetry §11.5 (no payload/PII)
  const digest = canonicalDigest(e.payload)
  const key = idempotencyKey(e, digest)
  const adapters = yield* AdapterRegistry
  const store = yield* IngestionStore

  // ONLY AdapterContractError → Quarantined. Defects propagate (die). Store errors surface.
  const disposition = yield* adapters.normalize(e).pipe(
    Effect.catchTag("AdapterContractError", (err) =>
      Effect.succeed(Quarantined.make({ reason: "malformed-payload", patchCandidate: true,
        payloadDigest: digest, eventType: e.eventType })))
  )
  const status = yield* store.commit(e, key, digest, disposition)   // IngestionStoreError NOT caught → surfaces
  if (status === "duplicate") return Duplicate.make({ upstreamEventId: key })
  if (status === "conflict")  return Committed.make({ upstreamEventId: key,
      disposition: Quarantined.make({ reason: "id-conflict", patchCandidate: true, payloadDigest: digest, eventType: e.eventType }) })
  return Committed.make({ upstreamEventId: key, disposition })
})
```

> **Superseded by §16** where they conflict: the conflict path returns a distinct `Conflict` terminal (NOT `Committed{id-conflict}`, §16.3); the idempotency key includes `tenantId` and returns `null`→`missing-event-id` quarantine when the upstream id is absent (§16.1/§16.2); provider dispatch + `unknown-provider` happen before `normalize` (§16.8).

- **Single public boundary** `ingestUnknown(input: unknown)` (§16.6) owns envelope decode: `Schema.decodeUnknown(RawEventEnvelope)`, `ParseError → Quarantined{malformed-envelope}` (safely-derived digest, placeholder eventType), then delegates valid envelopes here. Callers never pre-decode.
- **rawPayloadHash** (if present) is verified against the computed digest; mismatch → `Quarantined{malformed-envelope, hash-mismatch}` (§16.7).
- **Unexpected defects** are *not* caught → they die/propagate (surfaced, never laundered).
- **Store failure** (`IngestionStoreError`) is *not* caught → fails loudly, retryable.

## 7. Discord adapter — verified facts (primary sources)

Verified 2026-07-15 against `docs.discord.com/developers/topics/gateway-events` + `github.com/discord/discord-api-spec`:

- Gateway member events: **GUILD_MEMBER_ADD** (`guild_id`, `user{id}`, `roles[]`, joined_at, nick), **GUILD_MEMBER_UPDATE** (guild_id, user, roles[], …), **GUILD_MEMBER_REMOVE** (guild_id, user).
- REST OpenAPI: `specs/openapi.json` (stable) + `specs/openapi_preview.json` (preview, "breaking changes without notice"), OpenAPI 3.1, API v10.
- Session lifecycle (Tier-2 runtime, not wave 1): HELLO(10), READY(0), RESUMED(0), INVALID_SESSION(9), RECONNECT(7), Heartbeat(1); `s` sequence drives resume replay.

```ts
// providers/discord.ts — decode via Schema, map SchemaError→AdapterContractError
const DiscordMember = Schema.Struct({ guild_id: Schema.String, user: Schema.Struct({ id: Schema.String }),
  roles: Schema.Array(Schema.String) })
// GUILD_MEMBER_ADD → MembershipObserved · UPDATE → MembershipChanged · REMOVE → MembershipRevoked (roles omitted)
// MESSAGE_CREATE → Ignored{message-content-excluded, tier-3}
// else known-provider → Quarantined{unclassified-event, patchCandidate:true}
```

Classification table = PRD §11.4 (bounded to wave-1 admitted surface). `normalize` returns `Effect<IngestionDisposition, AdapterContractError>`; SchemaError on decode → `AdapterContractError` (→ malformed-payload quarantine upstream).

## 8. Governance artifacts (FR-6, FR-11, FR-12; PRD §11.6)

- **Source manifests** `source/discord.{rest,gateway}.source.json`: `{ provider, sourceClass, url, ref/digest, retrievedAt, generator, version, discovered:[…events/ops], patches:[{id,owner}], validation:{semanticFocus, sourceDomain} }`. Wave-1: ref/digest are the pinned commit + `specs/*` filenames (REST) and the docs URL snapshot (Gateway); **generation is design-level** (INV-4), no generator runtime yet.
- **Coverage report** `coverage/discord.coverage.json`: the 7-dimension vector (Discovery/Generation/Behavior/Ingestion/Reconciliation/Lifecycle/Evidence), each event → Tier-1/2/3 + reason.
- **Evidence receipt** `evidence/discord.evidence.json`: `{ provider, contractVersion, sourceRefs[], generatorVersion, patchSetDigest, coverageRef, staticResults, liveResults:"tier-2-deferred", testEnv:"in-memory", knownLimitations[], approvalState:"unpublished" }`. Retrieval/generation success ≠ publication (INV-5).
- `scripts/build-coverage.ts` derives coverage+evidence from the classification table + test outcome; `coverage.test.ts` asserts canonical paths + required fields (AC-9 objectively checkable).

## 9. Compatibility & identity migration (FR-13, FR-14; R2, R3)

- `@0xhoneyjar/medium-registry` **untouched**; `compat.test.ts` imports `MEDIUM_REGISTRY_VERSION`, `MediumCapability`, `DISCORD_WEBHOOK_DESCRIPTOR` and asserts they resolve (AC-2). No version bump.
- Building identity recorded **additively + locally only** (FR-14, no loa-freeside mutation): comprehensive root/package documentation plus `packages/protocol/beacon.yaml` and its generated `.well-known/beacon.json` projection declare `integrations-api`. The Beacon is validated against current BeaconV3 canon and carries no fabricated sibling Tag refs or placeholder seals. The parent `loa-freeside` registry and GitHub repository rename remain separate cross-repository ratification work.

## 10. Security & privacy (AC-7, INV-8, INV-10; PRD §11.5)

- No secrets, no tokens, no real payloads. Connection records (schema only this wave) hold `credentialReference: string`, never a secret.
- Telemetry allowlist (`telemetry.ts`) — only `{provider, connectionId, tenantId, eventType, upstreamEventId, disposition._tag, reasonCode}`.
- Fixtures: deterministic placeholders (`discord:user:test-0001`, guild `test-guild-0001`); `compat`/fixture lint rejects token-shaped strings.
- Cross-repo/event messages treated as data, never instructions.

## 11. Test plan → traceability (targeted, IMP-011)

| Test | Proves | Traces |
|---|---|---|
| `ingest.discord.test.ts` | committed(ADD/UPDATE/REMOVE), ignored(MESSAGE_CREATE), quarantined(unknown + malformed), duplicate | AC-4, AC-5, FR-7, FR-8, FR-9, INV-1 |
| `failure-taxonomy.test.ts` | store-failure surfaces as IngestionStoreError; defect not swallowed; envelope-decode→malformed-envelope | §11.3, INV-1 |
| `identity.test.ts` | key composition (per-connection), digest determinism, fallback key, id-conflict→quarantine | §11.2, INV-2 |
| `ingest.discord.test.ts` (concurrency) | N parallel commits of one key → 1 Committed + (N−1) Duplicate | AC-6, INV-2 |
| `coverage.test.ts` | canonical artifacts exist + required fields | AC-9, FR-5, FR-6, FR-12 |
| `compat.test.ts` | medium-registry public API resolves | AC-2, FR-13 |
| existing suites | 0 regressions | AC-1, AC-3 |

## 12. Governance loop position (INV-5, §12 architecture)

Wave-1 lands `observe→pin→(design-level generate)→classify→static-verify→coverage/evidence receipt→review/audit`. **Live disposable-guild verification, operator publish gate, consumer pin, canary/drift** are Tier-2 (no runtime/network this wave) — named in the evidence receipt `knownLimitations` + the continuation plan, not silently skipped.

## 13. Telegram / Luma continuation design (FR-15, FR-16; PRD §11.7)

- **Telegram** (`provider-telegram`, wave-2): governed derivative spec from Bot API docs + changelog + `tdlib/telegram-bot-api` server source + captured fixtures (no official OpenAPI → source class `docs+source`). Model webhook vs `getUpdates`, `update_id`, `allowed_updates`, 24h retention. **Limitation**: no trustworthy arbitrary historical member enumeration — coverage must separate observed transitions from reconstructible state.
- **Luma** (`provider-luma`, wave-3): generate from OpenAPI registry + webhooks; edges guest/ticket/subscription/membership/event/attendance. PII minimization default: seal/discard email, phone, registration answers, revenue unless a ratified use exists.
- Each is a written plan + named ratification target this cycle — **no code** (R5). DoD checklist per PRD §11.7.

## 14. Out of scope (this wave) — mirrors PRD §8

No second repo; no loa-freeside/registry mutation; no live Discord network/token/guild; no DB persistence; no Telegram/Luma code; no SDK generator runtime; no identity-merge/member-graph engine (schemas + edge vocabulary only); no package publish.

## 15. Architect decisions (locks)

- **AD-1** — New additive package `@0xhoneyjar/integrations-core`; medium-registry untouched (R3, no destructive rename).
- **AD-2** — Effect 3.21.2 idioms only; reference reconciled per §2 (never copied).
- **AD-3** — In-memory `Ref` store as the observable atomic contract; production backend preserves properties (PRD §11.6). Wave-1 package `private: true`.
- **AD-4** — Failure taxonomy §6.3 is the correctness spine: only typed provider errors quarantine; defects/store-errors surface. Non-negotiable in review.
- **AD-5** — Discord classification bounded to ADD/UPDATE/REMOVE/MESSAGE_CREATE + quarantine-all-else; Gateway transport/session semantics are Tier-2.

---

## 16. SDD review integration — hardened contracts (Flatline SDD, 2026-07-15)

3/3 headless voices (codex · cursor/composer-2.5 · grok); consensus **APPROVED**, chain_health ok, floor high, not degraded. 14 disputed + 14 blockers converged on the 11 correctness refinements below — **all integrated**; none touch a ratified decision (R1–R5) or a safety boundary. Evidence: `.run/flatline-evidence/sdd-review.json` · log `.run/flatline-evidence/sdd-integration-decision.md`. **These SUPERSEDE the inline §4–§6 sketches where they conflict.**

**16.1 — Idempotency key includes tenantId** *(CRIT 880/955)*. Key = `tenantId ∷ provider ∷ connectionId ∷ upstreamEventId`. `connectionId` is NOT assumed globally unique — tenant isolation lives in the key. Test: same connectionId across two tenants → two independent records.

**16.2 — Absent upstream id → quarantine, never content-fallback** *(HIGH 785)*. Empty/absent `upstreamEventId` cannot be safely idempotency-keyed; a content-digest key risks collapsing genuinely distinct events (silent loss). Such events → `Quarantined{reason:"missing-event-id"}` (+ payload digest for forensics) — a durable disposition (INV-1 holds). New reason-code `missing-event-id`. Supersedes PRD §11.2 content-fallback.

**16.3 — Conflict is a distinct terminal, never Committed** *(CRIT 910/940)*. `IngestionResult = Committed | Duplicate | Conflict`. `Conflict{idempotencyKey, priorDigest, newDigest}` when a stored key is re-seen with a different digest. Store does NOT overwrite; metrics/retries treat `Conflict` distinctly from success.

**16.4 — First disposition is sticky; recovery is Tier-2** *(CRIT 860)*. Wave-1 store is first-write-wins: the original disposition is durable; a later different-digest event → `Conflict` (does not supersede). Poison-pill (malformed first ingest shadows a corrected replay) is an **accepted wave-1 limitation**; admin-invalidate / supersede-with-audit / versioned-keys is Tier-2 deferred (no admin plane). Tested (sticky proven intentional); named in evidence `knownLimitations`.

**16.5 — Result field naming** *(HIGH 720/760)*. Results carry `idempotencyKey` (composite) + optional `upstreamEventId` (raw, when present). No field named `upstreamEventId` ever holds a composite key.

**16.6 — Single public boundary `ingestUnknown`** *(HIGH 760, disp 905)*. `ingestUnknown(input: unknown): Effect<IngestionResult, IngestionStoreError>` is the ONLY public entry: decode `Schema.decodeUnknown(RawEventEnvelope)`; `ParseError` → persist `Quarantined{malformed-envelope}` (digest of raw input + placeholder eventType, fields safely derived); success → `ingestEnvelope`. The package owns decode-failure quarantine — callers never pre-decode. Even malformed envelopes get a durable disposition.

**16.7 — rawPayloadHash verified or absent** *(HIGH 740, disp 915)*. `rawPayloadHash` is `Schema.optional`; the ingest-computed `canonicalDigest(payload)` is the source of truth. If present and ≠ computed → `Quarantined{malformed-envelope, reason:"hash-mismatch"}`. New reason-code `hash-mismatch`. Tested match + mismatch.

**16.8 — Provider-dispatched registry** *(HIGH 735/760, disp 890)*. `AdapterRegistry` is a provider-keyed map. Lookup miss for an admitted provider (telegram/luma, no adapter) → `Quarantined{unknown-provider}` BEFORE `normalize`. Discord layer registers only `discord`. Tested: telegram/luma envelope vs discord-only registry → unknown-provider.

**16.9 — Canonicalization contract** *(disp 915)*. `canonicalDigest`: JSON values only, recursively sorted object keys, arrays order-preserved, primitives JSON-encoded. Non-serializable input (circular / bigint / function / undefined-valued) throws → caller quarantines (`malformed-payload`/`malformed-envelope`). Deterministic; unit-tested for key-order independence + non-serializable rejection.

**16.10 — Envelope constraints + single Tier** *(HIGH 710, disp 735)*. Identifiers = `Schema.NonEmptyString`; digests = sha256-hex pattern `^[0-9a-f]{64}$`; timestamps = non-empty string (strict temporal parsing = Tier-2, avoids ceremony). `Tier` defined ONCE in `protocol/disposition.ts`; `coverage.ts` imports it. `sourceContractVersion` is telemetry/validation metadata this wave, not strict-enforced (rollout hazard).

**16.11 — Telemetry ordering + fail-closed coverage** *(disp 685/695/720)*. Annotate identity fields (provider/conn/tenant/eventType/idempotencyKey) BEFORE `normalize`; annotate `disposition._tag` + `reasonCode` AFTER disposition is computed. `build-coverage.ts` consumes a machine-readable test-outcome file and FAILS CLOSED (no evidence receipt if tests failed); `coverage.test.ts` validates artifacts against an Effect schema (semantic invariants), not mere file existence.

**Updated reason-code enum**: `message-content-excluded · unclassified-event · malformed-payload · malformed-envelope · unknown-provider · id-conflict · missing-event-id · hash-mismatch`.

---

## 17. Sprint review integration — trust boundary & Discord identity (Flatline sprint, 2026-07-15)

3/3 headless voices, consensus **APPROVED**, chain_health ok, floor high. 14 disputed + 14 blockers → 8 refinements, all integrated; none touch R1–R5 or safety (they ADD security/identity rigor). Evidence: `.run/flatline-evidence/sprint-review.json` · log `.run/flatline-evidence/sprint-integration-decision.md`. **Authoritative; supersedes earlier sections on Discord identity + entry point.**

**17.1 — `upstreamEventId` is a TRANSPORT-assigned delivery identity, NOT a payload field** *(CRIT 940 — the load-bearing correction)*. Verified (primary source): Discord Gateway dispatch events (GUILD_MEMBER_ADD/UPDATE/REMOVE) carry **no durable per-event id** — only a session-scoped sequence `s`. Therefore the ingestion/transport layer (above the wave-1 boundary) **assigns** a durable delivery id when it produces a `RawEventEnvelope`; it is never extracted from the Discord payload. Wave-1 in-memory fixtures supply this delivery id to represent what the runtime would assign. Deriving a *stable* Discord identity from Gateway session+sequence with reconnect/resume/sequence-gap replay is a **named Tier-2 continuation decision** (not wave-1). This keeps the vertical ingestable while §16.2 (absent id → quarantine) correctly guards a *transport* failure to assign one.

**17.2 — Quarantine-record identity is separate from event idempotency key** *(CRIT 885)*. When the idempotency key is `null` (missing-id) or the envelope is malformed, the durable quarantine record uses its OWN identity: `quarantine ∷ tenantId ∷ provider ∷ connectionId ∷ safeDigest` (never masquerading as an event idempotency key). The `IngestionStore` exposes `quarantine(record)` alongside `commit(...)`; both are atomic. Quarantine keys never collide with or shadow later valid-event keys.

**17.3 — Trust boundary (MUST invariant)** *(CRIT 840, HIGH 755)*. `tenantId`, `connectionId`, `provider` on the envelope are **trusted transport metadata**, bound by an authenticated ingestion/transport layer that lives **above** the wave-1 boundary; the provider `payload` is **untrusted**. In the real runtime, envelope-supplied identity MUST NOT override authenticated context. Wave-1 reference assumes a trusted caller (the runtime); this assumption is documented as a MUST and named as a continuation blocking item (webhook/transport auth).

**17.4 — Single public boundary** *(CRIT 880)*. `ingestUnknown(input: unknown)` is the **sole exported** ingestion function. `ingestEnvelope(envelope: RawEventEnvelope)` is **internal** (post-decode). The package `index.ts` exports `ingestUnknown` (+ schemas/layers), NOT `ingestEnvelope`. One test suite asserts all disposition paths route through `ingestUnknown`.

**17.5 — Effect peerDep pinned** *(HIGH 720/770, disp 910/930)*. `integrations-core` declares `effect` peerDep `>=3.21.2 <4` + a matching devDep — the range actually proven by typecheck (the APIs `Schema.TaggedError`/`Effect.Service`/`Ref.modify` need ≥3.21.2). This is a **subset** of medium-registry's `^3.10.0` (architect lock A5 preserved; shared version space still resolves to 3.21.2). medium-registry peerDep is **untouched**.

**17.6 — Spine is NON-PRODUCTION (hard DoD)** *(CRIT 820/860, disp 860/910)*. The wave-1 ingestion spine is explicitly labeled **NON-PRODUCTION** in README + evidence receipt until a durable-store + conflict-recovery PR lands. A **named ADR** (`grimoires/loa/decisions/` or continuation doc) specifies the future durable store contract (atomic compare-and-set, restart behavior, multi-instance dedup, conflict recovery: admin rekey / supersede-with-audit / tombstone). A **skipped/failing contract-test stub** (`test/durable-store-contract.skip.test.ts`) encodes the required durable semantics so wave-2 has an executable target. A poison-pill test proves the sticky-first-write invariant is intentional.

**17.7 — Security continuation checklist** *(HIGH 740)*. Named non-goal + continuation blocking item: **Ed25519 signed-interaction verification** (Discord signs interactions with a public key), timestamp/clock-skew tolerance, replay window, and a negative fixture for unsigned/tampered payloads at the transport boundary. Wave-1 has no transport → these are Tier-2, but named, not silently absent.

**17.8 — Canonicalization fully specified** *(HIGH 710/760, disp 905)*. `canonicalDigest`: input MUST be JSON-serializable; canonical form = UTF-8 bytes of JSON with recursively sorted object keys, arrays order-preserved, no insignificant whitespace, numbers in JSON form; sha256 → lowercase hex. Non-serializable input (circular / bigint / function / `undefined`-valued) throws → caller quarantines. `rawPayloadHash` (envelope field) hashes `payload` ONLY (never itself — distinct field, no self-inclusion). For **malformed-envelope** the safe-derived digest = sha256 of the length-capped (≤64 KiB) UTF-8 string form of the raw input; empty/missing input → rejected. Unit vectors cover key-order independence, arrays, unicode, and non-serializable rejection.

**Final reason-code enum**: `message-content-excluded · unclassified-event · malformed-payload · malformed-envelope · unknown-provider · id-conflict · missing-event-id · hash-mismatch` (quarantine-record identity §17.2 is orthogonal to reason codes).
