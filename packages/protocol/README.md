# `@0xhoneyjar/medium-registry`

Sealed Effect Schema for chat-medium presentation capabilities. The L2 layer of the chat-medium-presentation-boundary architecture (cycle R · 2026-05-04).

## Install

```bash
bun add @0xhoneyjar/medium-registry
# Effect is a peerDependency — install if not already present:
bun add effect@^3.10.0
```

## Quick start

```ts
import {
  DISCORD_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  hasCapability,
  pickCapability,
  mediumIdOf,
  MediumCapability,
} from '@0xhoneyjar/medium-registry';
import { Schema } from 'effect';

// Branch on capabilities
if (hasCapability(DISCORD_DESCRIPTOR, 'sticker')) {
  // emit a sticker payload
}
if (!hasCapability(CLI_DESCRIPTOR, 'embed')) {
  // fall back to plain text
}

// Round-trip schema decode
const decoded = Schema.decodeUnknownSync(MediumCapability)(rawJson);

// Type-narrowed identification
const id = mediumIdOf(decoded); // 'discord' | 'cli' | 'telegram-stub'
```

## API

### Discriminated union

`MediumCapability = Schema.Union(DiscordDescriptor, CliDescriptor, TelegramStub)`

Each variant carries a `_tag` literal. Adding a new medium descriptor is an additive minor bump — extend the Union, ship a new descriptor singleton, no breaking change for existing consumers.

### Concrete singletons

- `DISCORD_DESCRIPTOR` — full surface (text · embed · attachment · customEmoji · sticker · slash · modal · button · thread · reaction · ephemeral · mention)
- `CLI_DESCRIPTOR` — minimal (text · ANSI escapes only)
- `TELEGRAM_STUB` — placeholder; future telegram-renderer cycle fills

### Accessors

- `hasCapability(descriptor, key)` — boolean check; works on any descriptor variant
- `pickCapability(descriptor, key)` — value access (boolean or numeric like `embedFieldsMax`)
- `mediumIdOf(descriptor)` — extract the `_tag` for typed switch

### Override + binding shapes

For per-character + per-token wardrobe resolution (Sprint 4 + cycle-3 forward dep):

- `MediumCapabilityOverrides` — sparse Record keyed by mediumId; partial override of capability fields
- `TokenBinding` — `{ contract: 0x..., tokenId: string, resolverHint? }`

## Architectural locks honored

- **A2** Schema.Union(...) discriminated by `_tag` (matches `quests-protocol/substrate-step.ts` pattern)
- **A3** Descriptors are CONST singletons, not factory functions
- **A5** `effect: ^3.10.0` declared as peerDependency (asset-pipeline + quests-protocol precedent)

## Composition with sibling primitives

| Sibling | Boundary | This package's relationship |
|---------|----------|----------------------------|
| `@0xhoneyjar/asset-pipeline` `ConsumerConstraint` | What ENVIRONMENT ceiling applies (size limits, format preference)? | **Orthogonal sibling** (per SDD §3.3) — composer consumes both at variant-selection time |
| `@0xhoneyjar/quests-protocol` `SubstrateStepSubmission` | Quest engagement wire format | Different boundary; both use Effect Schema |
| `@0xhoneyjar/freeside-protocol` `MetadataDocument` | NFT metadata document | Sprint 4 adds `medium_capabilities?` optional field (additive) — feeds wardrobe-resolver scaffold |

## Doctrine

- `~/vault/wiki/concepts/chat-medium-presentation-boundary.md` — the L3 transforms boundary
- `~/vault/wiki/concepts/chathead-in-cache-pattern.md` — `medium_capabilities` is instance-3 of per-token rich-field pattern (Sprint 4 promotes)
- `~/vault/wiki/concepts/discord-native-register.md` — affirmative-blueprint cadence rules
- `~/bonfire/grimoires/loa/sdd.md` — full SDD with 8 architect locks

## Versioning

Per `loa-constructs/.claude/schemas/VERSIONING.md` — enum-locked, additive-only minors. Adding a new descriptor (e.g. `WebDescriptor`, `AgoraCanvasDescriptor`) is an additive minor; renaming or removing a capability key is a major bump requiring migration plan.
