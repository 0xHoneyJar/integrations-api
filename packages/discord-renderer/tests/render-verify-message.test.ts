/**
 * render-verify-message tests — C-5 V1 acceptance (bead arrakis-4re1).
 *
 * Verifies:
 *   1. A sample SurfaceConfig renders to the expected CV2 shape
 *      (Container(17) → TextDisplay(10) → Separator(14) → ActionRow(1)/Button(2)).
 *   2. The render-side ESCAPING (RENDER-CONTRACT) — markdown injection, mention
 *      injection, mass-ping, code-span preservation, protected-token survival.
 *   3. Theme.components → CV2 mapping (rich-text/divider/layout-container; skip
 *      data-bearing components fail-soft).
 *   4. The verify-URL link-button safety (http(s)-only, fail-soft to no button).
 *   5. The enabled gate + plain-text fallback.
 */

import { describe, it, expect } from 'bun:test';
import {
  renderVerifyMessageToDiscord,
  renderThemeVerifyComponents,
  escapeDiscordMarkdown,
  stripBlockSigils,
  containsUnescapedMarkdown,
  parseAccentColor,
  DEFAULT_ACCENT,
  ComponentType,
  ButtonStyle,
  IS_COMPONENTS_V2,
  DISCORD_RENDERER_VERSION,
} from '../src/index.js';
import {
  CLEAN_VERIFY_CONFIG,
  MALICIOUS_COPY_CONFIG,
  THEMED_VERIFY_CONFIG,
  DISABLED_VERIFY_CONFIG,
  VERIFY_URL,
} from './fixtures/verify-fixtures.js';

// ─── helpers to walk the CV2 tree ─────────────────────────────────────────

interface Block {
  type: number;
  content?: string;
  components?: Block[];
  accent_color?: number;
  style?: number;
  label?: string;
  url?: string;
}

function container(out: { components: unknown[] }): Block {
  const c = out.components[0] as Block;
  expect(c.type).toBe(ComponentType.CONTAINER);
  return c;
}

function textDisplays(c: Block): Block[] {
  return (c.components ?? []).filter((b) => b.type === ComponentType.TEXT_DISPLAY);
}

function allText(c: Block): string {
  return textDisplays(c)
    .map((b) => b.content ?? '')
    .join('\n');
}

function actionRowOf(c: Block): Block | undefined {
  return (c.components ?? []).find((b) => b.type === ComponentType.ACTION_ROW);
}

// ─── version ──────────────────────────────────────────────────────────────

describe('discord-renderer — version', () => {
  it('exports DISCORD_RENDERER_VERSION', () => {
    expect(DISCORD_RENDERER_VERSION).toBe('0.1.0');
    expect(DISCORD_RENDERER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
  it('exports IS_COMPONENTS_V2 = 1 << 15', () => {
    expect(IS_COMPONENTS_V2).toBe(32768);
  });
});

// ─── CV2 shape (sample SurfaceConfig → expected CV2) ──────────────────────

describe('renderVerifyMessageToDiscord — CV2 shape', () => {
  it('renders a Container(17) with the default accent when no theme', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    expect(out.flags).toBe(IS_COMPONENTS_V2);
    const c = container(out);
    expect(c.accent_color).toBe(DEFAULT_ACCENT);
  });

  it('emits heading TextDisplay(10) with ## title + body + separator', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const c = container(out);
    const blocks = c.components ?? [];
    // first block is the heading
    expect((blocks[0] as Block).type).toBe(ComponentType.TEXT_DISPLAY);
    expect((blocks[0] as Block).content).toBe('## Verify your wallet');
    // a separator follows the heading
    expect((blocks[1] as Block).type).toBe(ComponentType.SEPARATOR);
    // body text present
    expect(allText(c)).toContain('Link your wallet to unlock community roles');
  });

  it('emits an ActionRow(1) with a LINK Button(2) to the verify url', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const c = container(out);
    const row = actionRowOf(c);
    expect(row).toBeDefined();
    const btn = row!.components![0]!;
    expect(btn.type).toBe(ComponentType.BUTTON);
    expect(btn.style).toBe(ButtonStyle.LINK);
    expect(btn.label).toBe('Verify now');
    expect(btn.url).toBe(VERIFY_URL);
  });

  it('populates a plain-text fallback (escaped copy + url)', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    expect(out.contentFallback).toContain('Verify your wallet');
    expect(out.contentFallback).toContain('Verify now: ' + VERIFY_URL);
  });
});

// ─── RENDER-CONTRACT: the render-side escaping ────────────────────────────

describe('renderVerifyMessageToDiscord — render-side escaping (RENDER-CONTRACT)', () => {
  it('escapes markdown format chars in title / body / button label', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: MALICIOUS_COPY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const c = container(out);
    const heading = (c.components![0] as Block).content!;
    // the smuggled `##` heading sigil is stripped (renderer owns the level),
    // and the inline ** _ are escaped → literal text, not bold/italic.
    expect(heading.startsWith('## ')).toBe(true);
    expect(heading).not.toContain('## **'); // no compounded heading
    expect(heading).toContain('\\*\\*Owner\\*\\*');
    expect(heading).toContain('\\_verify\\_');

    const text = allText(c);
    // spoiler pipes escaped
    expect(text).toContain('\\|\\|free roles\\|\\|');
  });

  it('neutralizes @everyone / @here so they cannot mass-ping', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: MALICIOUS_COPY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const text = allText(container(out));
    // a zero-width space is inserted after the @, breaking the keyword.
    expect(text).not.toContain('@everyone');
    expect(text).toContain('@​everyone');
  });

  it('preserves a structural role-mention token verbatim (still ping-inert at send)', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: MALICIOUS_COPY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const text = allText(container(out));
    // the <@&id> token survives unescaped (escaping its `_`-less id would not
    // help; pings are blocked at the send layer's allowed_mentions). The point
    // is it does not render as broken text.
    expect(text).toContain('<@&123456789012345678>');
  });

  it('button label markdown is escaped', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: MALICIOUS_COPY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const row = actionRowOf(container(out))!;
    const label = row.components![0]!.label!;
    expect(label).toContain('\\_\\_Click\\_\\_');
    expect(label).toContain('\\*me\\*');
  });

  // BLOCKER-1: a CM `[here](url)` masked link must NOT render as a live
  // clickable link on the verify surface (phishing). Escaping `[`/`]` breaks
  // Discord's `[text](url)` parser → literal text. The renderer's OWN link
  // button is structural (ActionRow/Button), so it is unaffected.
  it('escapes masked-link grammar so [here](url) is not a LIVE link (BLOCKER-1)', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: MALICIOUS_COPY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const c = container(out);
    const text = allText(c);
    // the rendered TextDisplay copy contains NO unescaped `](` — the bracket→
    // paren transition that forms a Discord masked link. (We assert on the body
    // TextDisplays, not the structural button: the button has no `](` anyway.)
    for (const td of textDisplays(c)) {
      const content = td.content ?? '';
      // every `](` must be preceded by a backslash (escaped `]`).
      const idx = content.indexOf('](');
      if (idx !== -1) {
        expect(content[idx - 1]).toBe('\\');
      }
      // belt: a regex scan for an UNESCAPED `](` finds nothing.
      expect(/(?<!\\)\]\(/.test(content)).toBe(false);
    }
    // and the specific smuggled link text is rendered as escaped literal.
    expect(text).toContain('\\[here\\]');
  });

  // HIGH-1: block-sigil stripping is folded into escapeDiscordMarkdown, so the
  // BODY field (not just the title) is sigil-stripped through the renderer.
  it('strips leading block sigils from the BODY field, not just the title (HIGH-1)', () => {
    const cfg: typeof CLEAN_VERIFY_CONFIG = {
      ...CLEAN_VERIFY_CONFIG,
      config: {
        ...CLEAN_VERIFY_CONFIG.config,
        copy: { ...CLEAN_VERIFY_CONFIG.config.copy, body: '# H\n> q' },
      },
    };
    const out = renderVerifyMessageToDiscord({ surfaceConfig: cfg, verifyUrl: VERIFY_URL });
    const c = container(out);
    // the body TextDisplay carries the stripped copy (no heading / quote block).
    const body = textDisplays(c).map((b) => b.content ?? '').find((s) => s.includes('H'));
    expect(body).toBe('H\nq');
    // no body TextDisplay starts a line with a heading or quote sigil.
    for (const td of textDisplays(c)) {
      const content = td.content ?? '';
      // skip the renderer's OWN `## <title>` heading (block 0) — that level is
      // structural and owned by the renderer.
      if (content.startsWith('## ')) continue;
      expect(/^\s*(?:#{1,3}\s|>\s)/m.test(content)).toBe(false);
    }
  });
});

// ─── MEDIUM-1: cap is escape-aware (no dangling backslash at the boundary) ──

describe('renderVerifyMessageToDiscord — cap is escape-aware (MEDIUM-1)', () => {
  it('never leaves a dangling lone backslash when truncating escaped copy', () => {
    // buttonLabel cap is 80. Build a label whose ESCAPED form lands a lone `\`
    // exactly on the cap boundary: 79 plain chars then a `*` (escapes to `\*`).
    // Naive slice(0,80) would end on the `\` of `\*` → a dangling escape.
    const label = 'x'.repeat(79) + '*'.repeat(20);
    const cfg: typeof CLEAN_VERIFY_CONFIG = {
      ...CLEAN_VERIFY_CONFIG,
      config: {
        ...CLEAN_VERIFY_CONFIG.config,
        copy: { ...CLEAN_VERIFY_CONFIG.config.copy, buttonLabel: label },
      },
    };
    const out = renderVerifyMessageToDiscord({ surfaceConfig: cfg, verifyUrl: VERIFY_URL });
    const row = actionRowOf(container(out))!;
    const rendered = row.components![0]!.label!;
    // bounded to the Discord cap…
    expect(rendered.length).toBeLessThanOrEqual(80);
    // …and NOT ending in an odd run of backslashes (no dangling escape).
    const trailing = /\\+$/.exec(rendered);
    const trailingLen = trailing ? trailing[0].length : 0;
    expect(trailingLen % 2).toBe(0);
  });
});

// ─── unit: escapeDiscordMarkdown ──────────────────────────────────────────

describe('escapeDiscordMarkdown — unit', () => {
  it('escapes _ * ~ | outside inline code', () => {
    expect(escapeDiscordMarkdown('_italic_ *bold* ~strike~ ||spoiler||')).toBe(
      '\\_italic\\_ \\*bold\\* \\~strike\\~ \\|\\|spoiler\\|\\|',
    );
  });

  it('does NOT escape inside inline-code spans (tap-to-copy affordance)', () => {
    const out = escapeDiscordMarkdown('see `mibera_acquire` and *bold*');
    expect(out).toBe('see `mibera_acquire` and \\*bold\\*');
  });

  it('preserves custom emoji + timestamp tokens verbatim', () => {
    const out = escapeDiscordMarkdown('gm <:mibera_ninja:123456789012345678> <t:1700000000:f>');
    expect(out).toContain('<:mibera_ninja:123456789012345678>');
    expect(out).toContain('<t:1700000000:f>');
  });

  it('neutralizes @everyone and @here', () => {
    expect(escapeDiscordMarkdown('@everyone @here')).toBe('@​everyone @​here');
  });

  it('does not double-escape an already-escaped char', () => {
    expect(escapeDiscordMarkdown('already \\*escaped\\*')).toBe('already \\*escaped\\*');
  });

  it('is a no-op on empty input', () => {
    expect(escapeDiscordMarkdown('')).toBe('');
  });

  // HIGH-1: leading-line block sigils are stripped by escapeDiscordMarkdown
  // itself (folded in), so a `# heading` / `> quote` in ANY CM field — not just
  // the title — cannot render as a heading or quote block.
  it('strips leading block sigils so a body `# H\\n> q` is not a heading/quote (HIGH-1)', () => {
    const out = escapeDiscordMarkdown('# H\n> q');
    expect(out).toBe('H\nq');
    expect(out).not.toContain('# ');
    expect(out).not.toContain('> ');
  });

  it('escapes the masked-link grammar `[ ]` so a link cannot form (BLOCKER-1)', () => {
    const out = escapeDiscordMarkdown('see [here](https://evil.example) now');
    expect(out).toBe('see \\[here\\](https://evil.example) now');
    expect(/(?<!\\)\]\(/.test(out)).toBe(false);
  });

  it('containsUnescapedMarkdown reports raw format chars outside code', () => {
    expect(containsUnescapedMarkdown('hello *world*')).toBe(true);
    expect(containsUnescapedMarkdown('clean text')).toBe(false);
    expect(containsUnescapedMarkdown('`*inside code*`')).toBe(false);
  });
});

describe('stripBlockSigils — unit', () => {
  it('strips leading heading / quote / list sigils', () => {
    expect(stripBlockSigils('## heading')).toBe('heading');
    expect(stripBlockSigils('> quote')).toBe('quote');
    expect(stripBlockSigils('- bullet')).toBe('bullet');
  });
  it('leaves a non-sigil line untouched', () => {
    expect(stripBlockSigils('normal line')).toBe('normal line');
  });
  it('does not strip a # mid-line', () => {
    expect(stripBlockSigils('issue #42 filed')).toBe('issue #42 filed');
  });
});

// ─── theme component mapping ──────────────────────────────────────────────

describe('renderThemeVerifyComponents — Theme.components → CV2', () => {
  it('maps rich-text → TextDisplay (escaped), divider → Separator, recurses layout-container', () => {
    const theme = THEMED_VERIFY_CONFIG.config.theme!;
    const blocks = renderThemeVerifyComponents(theme) as Block[];
    // rich-text 'Welcome to **Mibera**...' → escaped TextDisplay
    const td0 = blocks.find((b) => b.type === ComponentType.TEXT_DISPLAY && b.content?.includes('Welcome'));
    expect(td0).toBeDefined();
    expect(td0!.content).toContain('\\*\\*Mibera\\*\\*');
    // divider → separator
    expect(blocks.some((b) => b.type === ComponentType.SEPARATOR)).toBe(true);
    // nested rich-text inside layout-container is flattened in
    const nested = blocks.find((b) => b.type === ComponentType.TEXT_DISPLAY && b.content?.includes('Roles unlock'));
    expect(nested).toBeDefined();
    expect(nested!.content).toContain('\\_instantly\\_');
  });

  it('skips data-bearing components (nft-gallery) fail-soft — never throws', () => {
    const theme = THEMED_VERIFY_CONFIG.config.theme!;
    const blocks = renderThemeVerifyComponents(theme) as Block[];
    // no block carries the nft-gallery's contractId / a gallery type
    expect(blocks.some((b) => b.type === ComponentType.MEDIA_GALLERY)).toBe(false);
    expect(JSON.stringify(blocks)).not.toContain('mibera-vm');
  });

  it('themed config renders the theme accent color (not default)', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: THEMED_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const c = container(out);
    expect(c.accent_color).toBe(0xc9a44c); // theme.branding.colors.accent
  });

  it('themed theme components appear between heading and body in the container', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: THEMED_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    const text = allText(container(out));
    expect(text).toContain('Welcome to');
    expect(text).toContain('Link your wallet to continue'); // body still present
  });
});

// ─── link-button safety ───────────────────────────────────────────────────

describe('renderVerifyMessageToDiscord — verify-url link-button safety', () => {
  it('drops the button (fail-soft) for a non-http(s) url', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: 'javascript:alert(1)',
    });
    const c = container(out);
    expect(actionRowOf(c)).toBeUndefined();
    // body still renders — the card is still useful
    expect(allText(c)).toContain('Link your wallet');
  });

  it('drops the button for a malformed url', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: CLEAN_VERIFY_CONFIG,
      verifyUrl: 'not a url',
    });
    expect(actionRowOf(container(out))).toBeUndefined();
  });

  it('accepts http and https urls', () => {
    for (const url of ['http://x.test/v', 'https://x.test/v']) {
      const out = renderVerifyMessageToDiscord({ surfaceConfig: CLEAN_VERIFY_CONFIG, verifyUrl: url });
      expect(actionRowOf(container(out))).toBeDefined();
    }
  });
});

// ─── enabled gate ─────────────────────────────────────────────────────────

describe('renderVerifyMessageToDiscord — enabled gate', () => {
  it('returns empty components when enabled=false but still a fallback', () => {
    const out = renderVerifyMessageToDiscord({
      surfaceConfig: DISABLED_VERIFY_CONFIG,
      verifyUrl: VERIFY_URL,
    });
    expect(out.components).toEqual([]);
    expect(out.contentFallback).toContain('Verify your wallet');
    expect(out.flags).toBe(IS_COMPONENTS_V2);
  });
});

// ─── parseAccentColor ─────────────────────────────────────────────────────

describe('parseAccentColor — unit', () => {
  it('parses #RRGGBB and RRGGBB', () => {
    expect(parseAccentColor('#c9a44c')).toBe(0xc9a44c);
    expect(parseAccentColor('6f4ea1')).toBe(0x6f4ea1);
  });
  it('expands #RGB shorthand', () => {
    expect(parseAccentColor('#abc')).toBe(0xaabbcc);
  });
  it('fail-softs garbage / named colors to the fallback', () => {
    expect(parseAccentColor('hotpink')).toBe(DEFAULT_ACCENT);
    expect(parseAccentColor('')).toBe(DEFAULT_ACCENT);
    expect(parseAccentColor(undefined)).toBe(DEFAULT_ACCENT);
    expect(parseAccentColor('#12')).toBe(DEFAULT_ACCENT);
  });
});
