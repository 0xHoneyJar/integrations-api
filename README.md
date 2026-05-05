# freeside-mediums

**Sealed Effect Schema registry for chat-medium presentation capabilities.**

The L2 boundary layer between L1 character config and L3 cmp-boundary transforms. Answers a single question across the freeside-* family:

> *What can THIS chat medium render?*

## Why this exists

Per `~/vault/wiki/concepts/chat-medium-presentation-boundary.md` doctrine: persona-bot output crosses a translation boundary between substrate truth (IDs, internal state) and chat-medium presentation (rendered surfaces). Each medium has a different rendering surface — Discord renders stickers + custom emoji + slash commands + modals; Telegram renders inline keyboards + sticker sets; CLI renders plain text + ANSI escapes.

Without a shared registry, every renderer hardcodes its medium's assumptions. This package centralizes that surface as sealed Effect Schema, consumed cross-repo by:

- `freeside-characters/packages/persona-engine` — composer + deliver layer condition output on current medium
- `freeside-quests/packages/discord-renderer` — typed source-of-truth for Discord capabilities
- `loa-finn` CLI — second-medium proof + substrate-fixture rendering

## Packages

| Package | Status | Purpose |
|---------|--------|---------|
| `@0xhoneyjar/medium-registry` (`packages/protocol`) | 0.1.0 sprint-2 (cycle R) | Sealed Effect Schema · MediumCapability discriminated union · Discord full + CLI minimal + Telegram stub descriptors |
| `@0xhoneyjar/cli-renderer` (`packages/cli-renderer`) | future sprint-3 | Minimal ANSI renderer · second-medium proof |

## Cycle context

Authored 2026-05-04 in cycle R (cmp-boundary-architecture). Per architect locks A1-A8 in `~/bonfire/grimoires/loa/sdd.md`:

- **A1** — standalone repo (cross-repo consumption + semver independence + no asymmetric ownership)
- **A2** — `MediumCapability` is `Schema.Union(...)` discriminated by `_tag` literal
- **A3** — descriptors are CONST singletons, not factory functions
- **A5** — `effect: ^3.10.0` declared as peerDependency (asset-pipeline + quests-protocol precedent)
- **A7** — additive-only schema bumps (zero existing-token regression)

## Development

```bash
bun install
bun test           # run all package tests
bun run typecheck  # workspace-wide typecheck
bun run build      # workspace-wide tsc -b --force
```

### Cycle-Q lessons (carry forward to publish)

- `npm publish` does NOT auto-rewrite `workspace:*` — use `bun publish` for actual publish (which does rewrite)
- `tsc -b` is dangerously stateful with `tsbuildinfo` — always `tsc -b --force` after a clean
- After publish, `npm view` may 404 for ~1-2 min during CDN propagation

## Composition

This package composes with sibling sealed-schema packages:

- `@0xhoneyjar/asset-pipeline` (cycle B) — `ConsumerConstraint` (orthogonal, per SDD §3.3 sibling pattern)
- `@0xhoneyjar/quests-protocol` (cycle Q) — `SubstrateStepSubmission` + `SubstrateStepVerdict` (different boundary)
- `@0xhoneyjar/freeside-protocol` (asset-pipeline cycle B) — `MetadataDocument` (Sprint 4 will add `medium_capabilities?` additive)

## License

MIT
