# Freeside integrations

`integrations-api` is the Freeside building for bringing external provider behavior into the station through versioned, evidence-backed contracts.

The first vertical is Discord membership ingestion. It proves one invariant: every decoded event reaches an explainable disposition—projected, ignored, quarantined, duplicate, or conflict—or fails loudly. It does not silently drop provider behavior.

> Wave 1 is a **non-production reference**. Its in-memory store is atomic within one process but is not crash-safe, cross-process, or durable. Production use is blocked until a transactional `IngestionStore`, transport security, and replay/reconciliation gates land.

## What changed

This repository was renamed from `freeside-mediums` / `mediums-api` to `integrations-api`. The transition remains additive:

- `@0xhoneyjar/integrations-core` is the new provider-ingestion and governance core.
- `@0xhoneyjar/medium-registry`, `@0xhoneyjar/cli-renderer`, and `@0xhoneyjar/discord-renderer` remain compatible presentation surfaces.
- The local BeaconV3 identity is now `integrations-api`.
- The GitHub repository rename is complete. The `loa-freeside` registry migration remains separate cross-repository ratification work tracked in [loa-freeside#469](https://github.com/0xHoneyJar/loa-freeside/issues/469).

## Architecture

```text
official provider contract
        │
        ▼
source manifest → provider adapter → ingestUnknown → IngestionStore
                                      │
                                      ├─ Projected observations
                                      ├─ Ignored with reason
                                      ├─ Quarantined with digest
                                      ├─ Duplicate
                                      └─ Conflict
```

`ingestUnknown` is the only public ingestion boundary. It decodes the envelope, verifies content identity, dispatches through a provider-keyed adapter, and commits the disposition atomically. The Discord reference adapter projects membership add/update/remove events, explicitly ignores message content, and quarantines unclassified or malformed events.

## Packages

| Package | Status | Responsibility |
|---|---|---|
| `@0xhoneyjar/integrations-core` | `0.1.0`, private, non-production | Typed event envelope, identity, dispositions, store contract, Discord adapter, coverage, and evidence |
| `@0xhoneyjar/medium-registry` | `0.2.0`, preserved | Sealed presentation-capability descriptors for Discord, CLI, and Telegram |
| `@0xhoneyjar/discord-renderer` | `0.1.0`, preserved | Theme to Discord Components V2 rendering and render-side escaping |
| `@0xhoneyjar/cli-renderer` | `0.1.0`, preserved | Terminal-safe ANSI rendering and second-medium proof |

## Freeside seams

The building emits privacy-bounded observations; it does not directly mutate sibling buildings.

| Seam | Current contract |
|---|---|
| Identity | Emits provider-scoped external account and community identifiers; identity resolution remains owned by `identity-api` |
| Activities | Emits membership observations suitable for a future typed activity/event port; no `activities-api` write path is claimed |
| Storage | Defines the `IngestionStore` port; a durable implementation is the next production gate |
| Presentation | Keeps `medium-registry` and both renderers isolated from ingestion semantics |
| Federation | [`packages/protocol/beacon.yaml`](packages/protocol/beacon.yaml) is the BeaconV3 source; [`.well-known/beacon.json`](.well-known/beacon.json) is its machine-readable projection |

`composes_with` is intentionally empty in wave 1. BeaconV3 requires a concrete `TagName@semver+hash` ABI, and no sibling port has been ratified yet. Listing aspirational consumers there would create a false integration claim.

## Governance and evidence

- Product and architecture: [`grimoires/loa/prd.md`](grimoires/loa/prd.md), [`grimoires/loa/sdd.md`](grimoires/loa/sdd.md), [`grimoires/loa/sprint.md`](grimoires/loa/sprint.md)
- Imported design kit: [`grimoires/loa/context/freeside-integrations-kit/`](grimoires/loa/context/freeside-integrations-kit/)
- Provider sources: [`packages/integrations-core/source/`](packages/integrations-core/source/)
- Coverage and evidence: [`packages/integrations-core/coverage/`](packages/integrations-core/coverage/), [`packages/integrations-core/evidence/`](packages/integrations-core/evidence/)
- Durable-store decision: [`grimoires/loa/decisions/ADR-durable-ingestion-store.md`](grimoires/loa/decisions/ADR-durable-ingestion-store.md)
- Continuation plan: [`grimoires/loa/context/integrations-continuation-plan.md`](grimoires/loa/context/integrations-continuation-plan.md)

Coverage generation fails closed unless the caller attests that tests passed:

```bash
bun run --cwd packages/integrations-core coverage:build --tests-passed
```

The wave-1 attestation is still self-reported. Binding evidence to a CI artifact digest and commit SHA is a wave-2 gate.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
bun run acvp:verify
```

The full suite preserves the legacy packages while exercising the integrations core, concurrency semantics, source/coverage/evidence schemas, and compatibility imports.

## Production gates

The candidate must remain private and non-production until all of these land:

1. A transactional, crash-safe, cross-process `IngestionStore` passes the deferred conformance suite.
2. Discord transport owns delivery identity, Gateway resume/replay, sequence-gap reconciliation, and Ed25519 webhook verification where applicable.
3. Evidence receipts bind to immutable source refs, a commit SHA, and CI artifacts.
4. A typed sibling port is ratified before any `composes_with` claim is added.
5. The registry/GitHub rename is coordinated in `loa-freeside` after this local identity is accepted.

## License

MIT
