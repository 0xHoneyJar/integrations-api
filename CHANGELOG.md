# Changelog

All notable changes to packages in `freeside-mediums` are tracked here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · semver discipline.

## [Unreleased]

## [@0xhoneyjar/medium-registry@0.2.0] — 2026-05-05 (cycle R sprint 3)

### Added — Discord context split (SKP-001 architectural fix)

Discord capabilities are NOT globally available across all delivery shapes. Modal and ephemeral capabilities require an interaction token, so they are unavailable via ordinary webhook delivery (Pattern B shell-bot, used by ruggy/satoshi/munkh persona-bots). Modeling them as universally true on a single descriptor was a load-bearing inaccuracy.

- `DISCORD_WEBHOOK_DESCRIPTOR` — webhook-shape delivery. NO modal · NO ephemeral · NO slashCommand · button STILL renderable.
- `DISCORD_INTERACTION_DESCRIPTOR` — interaction-shape delivery (slash + button + modal flows). Full Discord interactive surface.
- `DiscordWebhookSchema` / `DiscordInteractionSchema` narrow validators.
- `DiscordWebhookCapability` / `DiscordInteractionCapability` types.
- `MediumId` literal expanded: `'discord-webhook'` / `'discord-interaction'` / `'cli'` / `'telegram-stub'`.

### Changed

- `MediumCapability` Union now has 4 variants (was 3).
- `MEDIUM_REGISTRY_VERSION` bumped `0.1.0` → `0.2.0`.

### Deprecated

- `DISCORD_DESCRIPTOR` — points to `DISCORD_WEBHOOK_DESCRIPTOR` for back-compat. Will be **removed in v1.0.0**.
- `DiscordSchema` — alias to `DiscordWebhookSchema`. Will be removed in v1.0.0.
- `DiscordCapability` — alias to `DiscordWebhookCapability`. Will be removed in v1.0.0.

### Migration guide (v0.1.0 → v0.2.0)

For most consumers (persona-bot delivery via webhook), no code change required. `DISCORD_DESCRIPTOR` continues to work and resolves to webhook context.

For consumers using interaction-shape delivery (slash commands / button responses / modal builders):

```diff
- import { DISCORD_DESCRIPTOR } from '@0xhoneyjar/medium-registry';
+ import { DISCORD_INTERACTION_DESCRIPTOR } from '@0xhoneyjar/medium-registry';

- const medium = DISCORD_DESCRIPTOR;
+ const medium = DISCORD_INTERACTION_DESCRIPTOR;
```

For new code, prefer the explicit names — `DISCORD_DESCRIPTOR` is deprecated.

### Why this matters

Before v0.2.0, a renderer could mistakenly call `hasCapability(DISCORD_DESCRIPTOR, 'modal')` and get `true`, then build a modal payload that Discord rejects when delivered via webhook. After v0.2.0, the same call on `DISCORD_WEBHOOK_DESCRIPTOR` returns `false`, gating the modal-build branch correctly.

## [@0xhoneyjar/medium-registry@0.1.0] — 2026-05-04 (cycle R sprint 2)

### Added

Initial release. Sealed Effect Schema discriminated union for chat-medium presentation capabilities.

- `MediumCapability` sealed Union (3 variants: `discord` · `cli` · `telegram-stub`)
- `DISCORD_DESCRIPTOR` / `CLI_DESCRIPTOR` / `TELEGRAM_STUB` const singletons
- `hasCapability` / `pickCapability` / `mediumIdOf` typed accessors
- `MediumCapabilityOverrides` / `TokenBinding` / `CharacterMediumBinding` shapes (Sprint 4 forward-fit)
- `MEDIUM_REGISTRY_VERSION = "0.1.0"` semver constant

## [@0xhoneyjar/cli-renderer@0.1.0] — 2026-05-05 (cycle R sprint 3)

### Added

Initial release. ANSI-text renderer for chat-medium presentation registry — second-medium proof for `@0xhoneyjar/medium-registry`. Validates that the L2 registry shape generalizes beyond Discord.

- `renderDigest(input)` — long-form scheduled post (digest)
- `renderMicro(input)` — short reply (micro register)
- `renderWeaver(input)` — cross-zone narrative
- `stripAnsi(text)` — ANSI escape sanitizer (terminal injection guard)
- `containsAnsi(text)` — detection
- `assertNoDiscordArtifacts(text)` — drift catch (throws on Discord-only artifacts in CLI-bound voice)
- `CLI_RENDERER_VERSION = "0.1.0"`

### Security

Per Sprint 3 SKP-001 CRITICAL fix: untrusted LLM voice text is stripped of ANSI escape sequences before assembling renderer-owned decorations. Threat model: LLM output may contain raw ANSI sequences (accidentally or via prompt injection) that could corrupt terminal state, inject window-title escapes, or trigger control sequences on vulnerable terminals.
