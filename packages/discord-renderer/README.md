# @0xhoneyjar/discord-renderer

**Theme → Discord Components-V2 renderer. Owns the render-side of the C-1 RENDER-CONTRACT.**

The render-side half of the chat-medium presentation boundary for Discord. Sibling of [`@0xhoneyjar/cli-renderer`](../cli-renderer) in the freeside-mediums medium-render family: the sealed [`@0xhoneyjar/medium-registry`](../protocol) describes *what* Discord can render; this package *does* the rendering.

> Bead `arrakis-4re1` (C-5) · cycle C · 2026-05-31.

## What it does

Reads a **raw-but-bounded** `SurfaceConfig` from the freeside-worlds config-service (`@freeside-worlds/config-protocol`, C-1, merged) and emits a Discord **Components-V2** components array — **escaping every community-manager-editable string for Discord markdown** before output.

V1 surface: **`verify-message`** — the verify / wallet-linking message a community sees before linking their wallet.

```ts
import { renderVerifyMessageToDiscord, IS_COMPONENTS_V2 } from '@0xhoneyjar/discord-renderer';

const { components, contentFallback, flags } = renderVerifyMessageToDiscord({
  surfaceConfig,            // GET /v1/config/:world/verify-message → body.envelope
  verifyUrl: 'https://verify.mibera.xyz/?state=…', // substrate value (NOT CM-editable)
});

// send with discord.js / a webhook:
await channel.send({ components, flags }); // flags === IS_COMPONENTS_V2
```

## The RENDER-CONTRACT (why escaping lives here)

config-protocol's [`RENDER-CONTRACT.md`](https://github.com/0xHoneyJar/freeside-worlds/blob/master/packages/config-protocol/RENDER-CONTRACT.md) splits the BLOCKER-1 (config-injection) defense across two planes:

| Plane | Owner | Responsibility |
|---|---|---|
| **Write-side** | config-protocol + config-engine | medium-agnostic **VALIDATION** — bounded length, closed `props` slot-schema, control-byte rejection (fail-closed → 422) |
| **Render-side** | **this package** | medium-specific **ESCAPING** — Discord markdown |

The store stores raw-but-bounded; this renderer escapes. `escapeDiscordMarkdown`:

- escapes `_ * ~ |` (italic/bold/underline, strikethrough, spoiler) **outside** inline-code spans (backtick tap-to-copy preserved);
- neutralizes `@everyone` / `@here` mass-ping keywords (zero-width-space break — defense-in-depth alongside the send layer's `allowed_mentions: { parse: [] }`);
- preserves structural `<:emoji:id>` / `<t:…>` / mention tokens verbatim so they don't render as broken text.

**Scope boundary:** this handles the **Discord** side only. The verify **web page** HTML-escape path (`&`,`<`,`>`,`"`,`'`) is a different sink owned by the verify-page renderer (loa-freeside finding `arrakis-art2 F-001`). Escaping for one medium is necessary but not sufficient for the other.

## CV2 grammar

Mirrors the cluster's canonical Components-V2 renders in freeside-characters persona-engine (`deliver/enriched-render.ts`, `events/mint-announcement-render.ts`):

```
Container(17, accent_color)
  ├── TextDisplay(10)  ## <title>           (CM copy · escaped · sigil-stripped)
  ├── Separator(14)
  ├── [theme.components → CV2]              (rich-text → TextDisplay; divider → Separator;
  │                                          layout-container → flattened; data-bearing skipped)
  ├── TextDisplay(10)  <body>               (CM copy · escaped)
  └── ActionRow(1) [ Button(2, LINK) <buttonLabel> → verifyUrl ]
```

Sent with `flags: IS_COMPONENTS_V2` (`1 << 15`).

## Read seam (config-service, not yet deployed)

The config service (`@freeside-worlds/config-service`, bead `arrakis-e5jk` / C-6) is **not deployed yet**. `readSurfaceConfig` is built against the documented `GET` contract and **fail-soft on 404** (caller renders defaults):

```ts
import { readSurfaceConfig } from '@0xhoneyjar/discord-renderer';

const read = await readSurfaceConfig('mibera', 'verify-message', {
  baseUrl, serviceToken,
});
const config = read.ok ? read.envelope : DEFAULT_VERIFY_CONFIG; // 404 → defaults
```

## Development

```bash
bun test            # 39 tests — render shape, escaping cases, theme mapping, fail-soft read
bun run typecheck
bun run build
```

## License

MIT
