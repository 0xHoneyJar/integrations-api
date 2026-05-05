# @0xhoneyjar/cli-renderer

ANSI-text renderer for the chat-medium presentation registry. Second-medium proof for `@0xhoneyjar/medium-registry` — proves the L2 registry shape generalizes beyond Discord.

## What this is

When `loa-finn` (or any CLI tool) wants to render a persona-bot post for substrate validation, fixture inspection, or local dev, this package produces terminal-safe ANSI text instead of Discord embeds.

## What this is NOT

A user-facing product. The CLI medium exists to validate the registry shape; persona-bot users interact via Discord (today) and Telegram/web (future cycles).

## Usage

```ts
import { renderDigest, renderMicro, renderWeaver } from '@0xhoneyjar/cli-renderer';

const ansi = renderDigest({
  voice: 'big week. owsley showed up.',
  persona: { id: 'ruggy', displayName: 'ruggy' },
  postType: 'digest',
  meta: { zone: 'midi-watch', computedAt: '2026-05-04T21:00:00Z' },
});

console.log(ansi);
```

## Security: ANSI injection guard

LLM output may contain raw ANSI escape sequences (accidentally or via prompt injection). Per Cycle R Sprint 3 SKP-001 CRITICAL fix, this renderer **strips all ANSI escapes from `input.voice` before assembling output**. Never assume LLM-produced text is safe to feed to a terminal verbatim.

The strip is implemented at `assembleAnsi*` layer; the renderer's own decorative escapes (header bold, footer dim) are inserted AFTER the strip.

## Composition

- L2 registry: reads `CLI_DESCRIPTOR` from `@0xhoneyjar/medium-registry` to confirm capability shape (text + ansi only).
- L3 cmp-boundary: voice-discipline transforms run upstream in `freeside-characters/persona-engine/deliver/sanitize.ts` BEFORE this renderer sees the voice.
- L4 renderer: this package emits ANSI-formatted strings; consumer is responsible for stdout/stderr writes.

## Capability surface (CLI_DESCRIPTOR)

- `text` ✓
- `ansi` ✓
- All Discord/Telegram caps ✗ (rich payloads, modals, slash, sticker, etc.)

If a consumer routes Discord-shaped input (custom emoji `<:name:id>`, ephemeral flag refs) through this renderer, it throws — drift catch.

## License

MIT
