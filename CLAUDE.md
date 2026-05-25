@.claude/loa/CLAUDE.loa.md

# freeside-mediums — Cell Instructions

> This file is project-specific. The framework layer lives in `.claude/loa/CLAUDE.loa.md`.
> Project rules take precedence over framework defaults.

## What this cell is

`freeside-mediums` is a **building** on the freeside platform per [ADR-008](https://github.com/0xHoneyJar/loa-freeside/blob/main/decisions/008-freeside-as-factory.md). It is the sealed Effect-Schema registry that answers one question across the freeside-* family:

> *What can THIS chat medium render?*

It is the **L2 boundary layer** between L1 character config and L3 cmp-boundary transforms (per [`~/vault/wiki/concepts/chat-medium-presentation-boundary.md`](../../../vault/wiki/concepts/chat-medium-presentation-boundary.md) doctrine — substrate truth crosses a translation boundary to chat-medium presentation). Each medium has a different rendering surface (Discord = stickers + custom emoji + slash commands + modals; Telegram = inline keyboards + sticker sets; CLI = plain text + ANSI escapes). This cell centralizes that surface as sealed Effect Schema so every renderer stops hardcoding its medium's assumptions.

- **L2 SEALED-SCHEMA REGISTRY** — descriptors are CONST singletons, not runtime renderers (per architect lock A3).
- Federation slug: `mediums-api` (per `.well-known/beacon.json` v3).
- Published packages (both 0.x cycle-R cadence):
  - `@0xhoneyjar/medium-registry` (`packages/protocol`) — Discord webhook + interaction (split per SKP-001), CLI minimal, Telegram stub.
  - `@0xhoneyjar/cli-renderer` (`packages/cli-renderer`) — ANSI text renderer + ANSI injection guard.
- Package manager: **bun** (`bun.lock` present; workspaces declared in root `package.json`).

## Place in the hexagonal federation (ADR-009)

freeside-mediums is the **schema-shape declarer** that downstream renderers and persona engines consume. It does NOT publish runtime data and it does NOT consume runtime data — its outputs are TypeScript types + Effect Schemas evaluated at consumer build time.

```
   freeside-mediums  (sealed schema: MediumCapability discriminated union)
        │
        ▼
   freeside-characters/persona-engine   (conditions composer + deliver on medium capabilities)
   freeside-quests/discord-renderer     (typed source-of-truth for Discord renderer)
   loa-finn CLI                         (second-medium proof + substrate-fixture rendering)
```

Belts run one direction (raw → derived → integrated → presented). This cell sits at the **presentation-contract** seam — closer-to-meaning than raw protocol, but upstream of the L3 transform layer that actually renders.

## Key files

| File | Purpose |
|------|---------|
| `packages/protocol/` | `@0xhoneyjar/medium-registry` — sealed Effect Schema registry. Discriminated union of `MediumCapability` (`_tag` literal per A2). |
| `packages/cli-renderer/` | `@0xhoneyjar/cli-renderer` — ANSI text renderer; second-medium proof per cycle-R sprint-3 (ANSI injection guard included). |
| `package.json` | Root workspace declaration (`packages/protocol`, `packages/cli-renderer`). Scripts: `bun run build`, `bun run typecheck`, `bun test`. |
| `tsconfig.json` | Composite project config; references both packages. |
| `bunfig.toml` | Bun runtime config. `[install] production = false`; bun:test default discovery. |
| `bun.lock` | Lockfile — DO NOT regenerate without coordination (cross-repo `peerDependencies` interaction). |
| `README.md` | Public-facing overview + cycle-R sprint-3 highlights (Discord context split). |
| `CHANGELOG.md` | Per-package release notes. |

> **Note**: The cell does NOT carry a `.well-known/beacon.json` on `main` today. The BeaconV3 building-identity beacon currently lives on the feature branch `feat/cmp-boundary-arch-sprint-3-cli-renderer-and-ctx-split` (commit `41474ff`). When that branch lands on main, this file will be the canonical contract surface.

## Architect locks (carried forward from cycle R sprint 2/3)

From `~/bonfire/grimoires/loa/sdd.md` per the cycle-R authoring:

- **A1** — standalone repo (cross-repo consumption + semver independence + no asymmetric ownership).
- **A2** — `MediumCapability` is `Schema.Union(...)` discriminated by `_tag` literal.
- **A3** — descriptors are CONST singletons, not factory functions.
- **A5** — `effect: ^3.10.0` declared as peerDependency (asset-pipeline + quests-protocol precedent).
- **A7** — additive-only schema bumps (zero existing-token regression).
- **SKP-001** (sprint-3) — Discord descriptor split into webhook + interaction contexts. Modal/ephemeral capabilities are interaction-only.

## Tooling

| Tool | Use |
|------|-----|
| `br` (beads_rust) | Task tracking for this cell. Initialized with `issue_prefix: mediums-api`. See `.beads/`. |
| `ck` (seek) | Code search — preferred over `grep` (per Loa framework rules). |
| `bun` | Package manager + test runner. `bun install`, `bun test`, `bun run build`, `bun run typecheck`. |
| `tsc` | Type check (via `bun run typecheck`); workspace-wide `tsc -b --force` after clean (cycle-Q lesson: `tsc -b` is stateful). |

### Cycle-Q lessons (carry forward to publish)

- `npm publish` does NOT auto-rewrite `workspace:*` — use `bun publish` for actual publish (which does rewrite).
- `tsc -b` is dangerously stateful with `tsbuildinfo` — always `tsc -b --force` after a clean.
- After publish, `npm view` may 404 for ~1-2 min during CDN propagation.

## Runtime invariants

- **DO NOT add chat-medium renderers to this repo.** This is a sealed schema registry. Renderers consume the schema; they don't live here. (Exception: `cli-renderer` was added under explicit cycle-R sprint-3 architect approval as the second-medium proof for the schema.)
- **DO NOT break the discriminated union contract** (A2). Adding a new medium is `Schema.Union(...existing, NewMedium)` — never replace the existing tags.
- **DO NOT change descriptor shape between minor versions** (A7). Only additive bumps. Breaking shape changes are major versions only and require coordinated downstream PRs in freeside-characters, freeside-quests, loa-finn.
- **DO NOT downgrade `effect` from peerDependency to dependency** (A5). Sealed schemas across the freeside-* family share the same Effect version space; making it a direct dependency would fork it.
- **DO NOT commit Discord/Telegram/CLI runtime secrets to this repo.** No `.env`, no API tokens — this cell has no runtime. If a test fixture needs a token-shaped value, use a deterministic test placeholder.

## Composition (sibling sealed-schema packages)

| Package | Cycle | Shape |
|---------|-------|-------|
| `@0xhoneyjar/asset-pipeline` | cycle B | `ConsumerConstraint` (orthogonal, per SDD §3.3 sibling pattern) |
| `@0xhoneyjar/quests-protocol` | cycle Q | `SubstrateStepSubmission` + `SubstrateStepVerdict` (different boundary) |
| `@0xhoneyjar/freeside-protocol` | asset-pipeline cycle B | `MetadataDocument` (Sprint 4 will add `medium_capabilities?` additive — additive coordination with this cell) |

## Compose / framework

For framework-level instructions (workflow gates, skill conventions, beads protocol, hooks, safety, Loa's three-zone model), see `.claude/loa/CLAUDE.loa.md`. Cell-specific guidance in this file takes precedence on conflict.

## Mount provenance

This cell was built **pre-Loa-introduction** (commits through `10a7f69`). The Loa harness was mounted on **2026-05-25** via the cluster-meta remediation cycle per [ADR-009 D-4](https://github.com/0xHoneyJar/loa-freeside/blob/feat/identity-api/decisions/009-freeside-hexagonal-federation.md) — *"Agents need to be able to run beads/cycles. We mount if not already mounted."* Mount branch: `cluster-meta/loa-mount-2026-05-25` (off `main`). No `src/` or `packages/*/` files were modified during mount. No npm/bun dependencies were added or upgraded. No tracked config (`package.json`, `tsconfig.json`, `bunfig.toml`, `bun.lock`, `README.md`, `.gitignore`) was touched.

> Feature branch coord note: after this mount lands on `main`, the active feature branch `feat/cmp-boundary-arch-sprint-3-cli-renderer-and-ctx-split` will need to rebase onto the new main to inherit the mount.
