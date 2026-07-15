# Claude CLI implementation prompt

You are working in:

`/Users/zksoju/Documents/GitHub/mediums-api`

## Operator decision

Evolve the existing `freeside-mediums` building into the Freeside integrations
building. Do not create a second `freeside-integrations` repository
preemptively. The current medium registry has little consumer gravity and is a
seed, not a permanent presentation-only boundary.

Preferred external identity:

- repository/building: `freeside-integrations`
- federation slug: `integrations-api`
- umbrella domain: integrations
- configured runtime instance: connection
- presentation description: medium capability

The existing `@0xhoneyjar/medium-registry` package must remain available as a
compatibility surface during migration.

## Room

Enter a bounded ARCH room.

- Domain: Freeside provider integrations.
- Goal: plan and then implement the evolutionary migration of this building.
- Primary construct: the-arcade / OSTROM.
- Supporting concerns: protocol contracts, Effect services/layers, governance.
- Allowed inputs: current repository truth, its Loa artifacts, `/recall`, the
  attached architecture kit, and the primary sources below.
- Forbidden: ambient vault loading, inventing provider behavior, committing
  secrets, destructive renames, bypassing Loa gates, or treating generated
  output as published truth.
- Exit condition: a reviewed, testable Discord-first vertical with compatibility
  preserved and an explicit Telegram/Luma continuation plan.

The operator decision above supersedes the current repository statement that
this building must remain a runtime-free sealed registry. Preserve useful
schema contracts, but do not treat that historical mission as immutable.

## Before editing

1. Read `AGENTS.md`, `CLAUDE.md`, `.claude/loa/CLAUDE.loa.md`, current Loa
   artifacts, git status, branch state, and the latest relevant notes.
2. Check `.run/` state. Do not take over a halted or unrelated workflow.
3. Run the governed `/recall` route for prior decisions around mediums,
   integrations, Discord, Telegram, Luma, identity linking, member graph, and
   building boundaries. Treat recalled material according to its use labels.
4. Inspect all existing consumers before renaming packages or exports.
5. Verify live upstream facts against primary sources. Do not trust a search
   synthesis without source-domain and semantic-focus checks.
6. Use the installed local Effect source under `.repos/effect` and the current
   repository's Effect patterns when designing services, layers, errors, and
   schemas.

## Required architecture

One building owns these internal domains:

```text
upstream truth -> generated SDK + patches -> provider adapter
              -> connection runtime -> ingestion -> normalized observations
              -> downstream member graph / identity / presentation consumers
```

Use internal package and service boundaries rather than new repositories:

- protocol: integration, connection, observation, coverage, and evidence schemas
- sources: source pins, upstream snapshots, generator metadata, patch corpus
- providers: Discord first; Telegram second; Luma third
- runtime: webhook, gateway, polling, cursors, retry, dedupe, replay
- presentation: the current medium descriptors and compatibility package
- control plane: connection lifecycle, health, permissions, and sync operations

Keep these ownership rules:

- Integrations owns provider-specific interpretation.
- Identity owns verified account/person and wallet links.
- The member graph owns cross-source projection and conservative merges.
- A transport/event ledger may persist observations, but does not own provider
  semantics.
- Secrets are references to an external secret store, never schema payloads or
  committed fixtures.

## Invariants

1. Every received upstream event ends as `projected`, `ignored-with-reason`,
   `quarantined`, or `duplicate`; there are no silent drops.
2. Idempotency registration and durable disposition persistence are atomic.
3. Unknown provider behavior becomes a source/SDK patch candidate; adapters do
   not normalize undocumented behavior by hand and forget it.
4. Generated files are changed through the generator or patch corpus only.
5. Published contracts include source digest, generator version, patch digest,
   coverage report, verification evidence, and approval state.
6. Consumers pin published contract versions.
7. Identity merges require explicit proof. Email equality is not identity proof.
8. Message content and unnecessary PII are excluded by default.
9. “100% coverage” means complete surface classification, complete Tier-1
   conformance, and zero silent ingestion loss—not universal provider knowledge.

## Provider sequence

### Discord

Build the complete reference vertical first:

- official REST/OpenAPI source pin
- Gateway event catalog as a separate source
- generated client and typed error surface
- patch corpus
- connection/install model
- disposable-guild live harness
- member/role observations
- reconciliation, replay, cleanup, and drift report
- existing medium descriptors retained as presentation capability contracts

### Telegram

Design next, but do not pretend it has an official OpenAPI source. Build a
governed derivative from the official Bot API docs, changelog, server source,
and captured fixtures. Model webhook and `getUpdates` cursor semantics and state
the membership-reconciliation limitations explicitly.

### Luma

Use its OpenAPI registry and webhooks. Prioritize guest, ticket, subscription,
membership, event, and attendance relationships. Seal or discard email, phone,
registration answers, revenue, and other PII unless a ratified use requires it.

## Coverage contract

Report separate dimensions:

- discovered surface classified
- generated surface
- typed happy/error behavior
- ingestion disposition
- reconciliation
- lifecycle and cleanup
- evidence and source provenance

Every operation/event must be Tier 1, deferred, or excluded with a reason.

## Workflow

Use Loa's planning and implementation gates. First produce or update a candidate
architecture/SDD and sprint plan; do not silently turn this prompt into build
permission if the active repository gate requires operator ratification.

Plan bounded waves:

1. Mission/identity migration and compatibility contract.
2. Common source, patch, coverage, connection, and observation protocols.
3. Discord REST + Gateway source factory.
4. Discord connection and ingestion vertical.
5. Live conformance, reconciliation, nuke/cleanup, and evidence reporting.
6. Telegram source distiller and adapter.
7. Luma generated client, webhooks, and reconciliation.

Keep PRs reviewable. Avoid a single generated mega-PR.

## Acceptance for the first implementation wave

- Existing protocol and renderer tests remain green.
- Existing medium-registry imports remain valid.
- New contracts are additive unless a ratified migration explicitly says
  otherwise.
- The Discord reference path proves committed, duplicate, ignored, and
  quarantined dispositions.
- Malformed and unknown Discord events cannot disappear.
- No secrets or real user payloads are committed.
- Typecheck, tests, review, audit, and coverage report are green.
- The final handoff names unresolved provider limitations and the exact next
  ratification decision.

## Primary sources

- https://github.com/alchemy-run/distilled
- https://github.com/alchemy-run/alchemy-effect/pull/797
- https://v2.alchemy.run/blog/2026-07-02-cloudflare-resource-factory/
- https://blog.hosaka.fm/governance-engineering/
- https://github.com/discord/discord-api-spec
- https://docs.discord.com/developers/events/gateway
- https://core.telegram.org/bots/api
- https://github.com/tdlib/telegram-bot-api
- https://docs.luma.com/llms.txt

Use `architecture.md` and `reference-implementation/` from the supplied kit as
candidate inputs. Reconcile them against current truth; do not copy them blindly.

