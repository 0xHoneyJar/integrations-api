# Freeside Integrations — continuation plan (wave 2+)

Status: **candidate continuation** (satisfies PRD AC-10 / FR-15 / FR-16)
Date: 2026-07-15
Traces: PRD §11.7 · SDD §13 / §17 · ADR-durable-ingestion-store

Wave 1 shipped the governance harness + Discord reference vertical (NON-PRODUCTION,
in-memory). This document names every deferred item so wave 2 needs **zero re-discovery**.

## 1. Blocking items before ANY production use (wave-2 gate)

Each is a **named** deferral (Tier-2), not a silent gap:

- **Durable store** — implement the atomic compare-and-set backend per
  `grimoires/loa/decisions/ADR-durable-ingestion-store.md`; un-skip
  `packages/integrations-core/tests/durable-store-contract.skip.test.ts`; they MUST pass
  before the evidence receipt is flipped to `production` (§17.6).
- **Trust boundary (MUST)** — `tenantId` / `connectionId` / `provider` on the envelope are
  trusted transport metadata bound by an **authenticated ingestion/transport layer**; the
  `payload` is untrusted. Define who may call ingest; envelope-supplied identity MUST NOT
  override authenticated context (§17.3).
- **Transport + signature verification** — Gateway/webhook receipt, reconnect/resume,
  `s` sequence-gap replay, and **Ed25519 signed-interaction verification** (Discord signs
  interactions with a public key), plus clock-skew tolerance and a replay window; add a
  negative fixture for unsigned/tampered payloads (§17.7).
- **Discord durable identity** — `upstreamEventId` is transport-assigned this wave
  (Gateway carries no durable per-event id). Decide the durable identity strategy
  (session+sequence with persistence boundaries, or delivery-id) before live ingestion
  (§17.1).

## 2. Telegram (wave-2 provider) — FR-15

- **No official OpenAPI.** Build a **governed derivative** internal spec from: Bot API docs
  (`core.telegram.org/bots/api`), the changelog, the official server source
  (`github.com/tdlib/telegram-bot-api`), and captured fixtures. Source class `docs` + `source`.
- Model **webhook vs `getUpdates`**, `update_id`, `allowed_updates`, and the **24-hour
  upstream retention window**.
- **Limitation:** Telegram cannot provide trustworthy arbitrary historical member
  enumeration — coverage MUST separate *observed membership transitions* from
  *reconstructible full state*.
- DoD: source classes + governance derivation · cursor/webhook semantics · membership
  reconstruction limitations · PII posture · named ratification target.

## 3. Luma (wave-3 provider) — FR-16

- Generate from the **OpenAPI registry** + **webhooks** (`docs.luma.com/llms.txt`). Source
  class `openapi`.
- Prioritize edges: guest registration/status, tickets, calendar subscription, membership
  tiers/status, event relationships, attendance.
- **PII minimization (default):** seal/discard email, phone, registration answers, wallet
  addresses, revenue unless a **ratified** use + retention policy exists. Stable upstream
  IDs + necessary edges enter the graph.
- DoD: same checklist as §2.

## 4. Identity & member-graph (not this building)

Integrations emits normalized `Observation`s. **Identity** owns verified account/person +
wallet links and publishes link/revocation observations; the **member graph** owns
cross-source projection + conservative merges. Provider facts are **not** identity
conclusions — email/username/display-name equality is never identity proof (INV-7). These
engines are separate work.

## 5. Exact next ratification decision (operator)

> **Publish gate:** should `@0xhoneyjar/integrations-core` be published (dropping
> `private: true`) as a `0.x` contract for downstream pinning, or remain in-repo until the
> durable store lands? Publishing implies a consumer-pinnable contract version + the
> governance publication receipt — but the spine is NON-PRODUCTION until the durable store
> + conflict-recovery PR lands. **Recommended: keep private until the durable store; publish
> the contract package only when the evidence receipt can read `production`.**

This is the single decision blocking wave-2 sequencing; everything else above is planned.
