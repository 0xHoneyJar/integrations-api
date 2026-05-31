/**
 * render-verify-message.ts — Theme → Discord Components-V2 renderer (C-5 V1).
 *
 * The V1 surface of bead arrakis-4re1: render a community-manager-editable
 * `verify-message` SurfaceConfig (freeside-worlds config-protocol) into a
 * Discord Components-V2 components array, OWNING the per-medium escaping
 * (the render-side half of the C-1 RENDER-CONTRACT).
 *
 * ── What this renders ─────────────────────────────────────────────────────
 * The verify message a community sees in their Discord guild before linking
 * their wallet. Layout (top → bottom):
 *
 *   Container (accent_color from theme.branding.colors.accent)
 *     ├── TextDisplay  ## <title>            (heading · CM copy, escaped)
 *     ├── Separator
 *     ├── [theme.components mapped to CV2]    (optional — when a theme with a
 *     │                                        verify page layout is present)
 *     ├── TextDisplay  <body>                 (CM copy, escaped)
 *     └── ActionRow [ LinkButton <buttonLabel> → verifyUrl ]
 *
 * The Container + ActionRow + LinkButton mirror the canonical CV2 grammar in
 * freeside-characters persona-engine (enriched-render.ts · mint-announcement-
 * render.ts) — same Container(17)/TextDisplay(10)/Separator(14) blocks, plus
 * the ActionRow(1)/Button(2) link-button shape for the verify CTA.
 *
 * ── Trust model (RENDER-CONTRACT) ─────────────────────────────────────────
 * `config` arrives ALREADY validated + bounded by the config-service write
 * side (fail-closed → 422 on bad input): length-capped, control-byte-free,
 * closed props slot-schema. This renderer does the OTHER half: it ESCAPES
 * every CM-editable string for Discord markdown before placing it in a
 * TextDisplay. The `verifyUrl` is a SUBSTRATE value supplied by the bot at
 * render time (NOT CM-editable), so it is not escaped-as-prose — but it IS
 * validated as a safe http(s) URL for a Discord link button (button-link
 * safety: Discord rejects non-http(s) urls; we fail-soft to no button rather
 * than emit an invalid component).
 */

import type {
  VerifyMessageConfig,
  SurfaceConfig,
  Theme,
  ComponentInstance,
} from './config-types.js';
import { escapeDiscordMarkdown } from './escape-discord.js';
import { parseAccentColor, DEFAULT_ACCENT } from './theme-color.js';
import {
  container,
  textDisplay,
  separator,
  actionRow,
  linkButton,
  IS_COMPONENTS_V2,
} from './cv2.js';

/** Discord button label hard limit (API). config-protocol caps buttonLabel ≤ 80 too. */
const BUTTON_LABEL_MAX = 80;
/** Discord TextDisplay content hard limit (API). config-protocol caps body ≤ 4000. */
const TEXT_DISPLAY_MAX = 4000;

export interface RenderVerifyMessageInput {
  /**
   * The validated, bounded verify-message SurfaceConfig envelope — exactly the
   * `envelope` field of the config-service GET body
   * (`GET /v1/config/:world/verify-message`). The caller has already read the
   * service (or fallen back to defaults on 404) before calling this renderer.
   */
  readonly surfaceConfig: SurfaceConfig<'verify-message'>;
  /**
   * The verify link the CTA button points at. A SUBSTRATE value supplied by
   * the bot (e.g. `https://verify.<world>.xyz/?state=…`), NOT CM-editable.
   * Must be http(s); a non-http(s) url fail-softs to NO button.
   */
  readonly verifyUrl: string;
}

export interface RenderVerifyMessageOutput {
  /** The Components V2 array. Send with `flags: IS_COMPONENTS_V2`. */
  readonly components: unknown[];
  /** Plain-text fallback for clients without Components V2 (escaped copy). */
  readonly contentFallback: string;
  /** The flag the caller MUST set on the message (`1 << 15`). */
  readonly flags: number;
}

/** http(s)-only URL guard for the link button (Discord rejects other schemes). */
function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Hard-truncate already-bounded + already-ESCAPED text to the Discord API cap
 * (defense-in-depth). Escaping happens before capping (each `\X` is one logical
 * char but two code units), so a naive `slice(0, max)` can sever a `\X` pair and
 * leave a DANGLING lone backslash that Discord would render as an escape of the
 * next (truncated-away) char — or, worse, escape whatever the cap boundary lands
 * on (MEDIUM-1). After slicing, if the result ends in an ODD run of backslashes,
 * drop the trailing lone one so we never emit a dangling escape.
 */
function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const trailingBackslashes = /\\+$/.exec(sliced);
  if (trailingBackslashes && trailingBackslashes[0].length % 2 === 1) {
    return sliced.slice(0, -1);
  }
  return sliced;
}

/**
 * Render a verify-message SurfaceConfig into a Discord Components-V2 message.
 *
 * Pure function — no I/O, no side effects, test-friendly. Mirrors the
 * `buildEnrichedMintAnnouncement` contract shape (components + fallback).
 *
 * When `config.enabled === false`, returns an empty components array (the
 * caller should not post a disabled verify message) but still a usable
 * fallback string — the enabled gate is a caller policy, surfaced not enforced.
 */
export function renderVerifyMessageToDiscord(
  input: RenderVerifyMessageInput,
): RenderVerifyMessageOutput {
  const { surfaceConfig, verifyUrl } = input;
  const config: VerifyMessageConfig = surfaceConfig.config;
  const { copy, theme } = config;

  // ── Escape every CM-editable string (the render-side of RENDER-CONTRACT) ──
  // `escapeDiscordMarkdown` now folds in leading-line block-sigil stripping
  // (HIGH-1), so the renderer owns the `##` heading level for the title AND
  // body/buttonLabel/theme rich-text are all sigil-stripped uniformly — no
  // field can forget it. `cap` runs AFTER escaping and is escape-aware
  // (trims a dangling lone backslash at the truncation boundary — MEDIUM-1).
  const safeTitle = escapeDiscordMarkdown(copy.title);
  const safeBody = cap(escapeDiscordMarkdown(copy.body), TEXT_DISPLAY_MAX);
  const safeButtonLabel = cap(escapeDiscordMarkdown(copy.buttonLabel), BUTTON_LABEL_MAX);

  const accent = theme ? parseAccentColor(theme.branding.colors.accent) : DEFAULT_ACCENT;

  const blocks: unknown[] = [];

  // Heading — renderer owns the `##` level; CM title is escaped + sigil-stripped.
  blocks.push(textDisplay(`## ${safeTitle}`));
  blocks.push(separator());

  // Optional theme verify-page components mapped into CV2 (V1: text-bearing
  // components only). Placed between heading and body so a CM's custom blocks
  // appear in the card. Omitted entirely when there is no theme / no verify page.
  const themeBlocks = theme ? renderThemeVerifyComponents(theme) : [];
  for (const b of themeBlocks) blocks.push(b);
  if (themeBlocks.length > 0) blocks.push(separator());

  // Body copy.
  if (safeBody.length > 0) {
    blocks.push(textDisplay(safeBody));
  }

  // CTA — link button to the verify URL. Fail-soft: a non-http(s) url or an
  // empty button label drops the button rather than emitting an invalid
  // component (the body still tells the user what to do).
  if (isSafeHttpUrl(verifyUrl) && safeButtonLabel.length > 0) {
    blocks.push(actionRow([linkButton(safeButtonLabel, verifyUrl)]));
  }

  const components: unknown[] = [container(blocks, accent)];

  // Plain-text fallback — escaped copy, no components. Useful for clients
  // without CV2 + for log/preview surfaces.
  const fallbackParts = [safeTitle, safeBody].filter((s) => s.length > 0);
  if (isSafeHttpUrl(verifyUrl) && safeButtonLabel.length > 0) {
    fallbackParts.push(`${safeButtonLabel}: ${verifyUrl}`);
  }
  const contentFallback = fallbackParts.join('\n\n');

  // enabled=false → caller should not post; surface an empty components array.
  if (config.enabled === false) {
    return { components: [], contentFallback, flags: IS_COMPONENTS_V2 };
  }

  return { components, contentFallback, flags: IS_COMPONENTS_V2 };
}

// ── Theme.components → CV2 (V1 scope: text-bearing verify-page components) ─────

/**
 * Map a Theme's verify page layout components to CV2 blocks (V1 slice).
 *
 * V1 maps the TEXT-BEARING component types that make sense in a Discord verify
 * message and whose props the config-protocol slot-schema already bounds:
 *
 *   rich-text        → TextDisplay (content, escaped)
 *   button           → (deferred to the renderer's own CTA — see note)
 *   divider / spacer → Separator
 *   layout-container → recurse into children (Discord has no nested container
 *                      grammar for verify messages; flatten the children inline)
 *
 * NOT mapped in V1 (require server-side data resolution / a richer surface,
 * deferred): nft-gallery, leaderboard, profile-card, token-gate, image.
 * Those resolve live data (contract reads, score data, the user's own NFTs)
 * which the verify message — a pre-auth surface — has no session to resolve.
 * They are silently skipped (fail-soft): an un-renderable component never
 * breaks the verify card.
 *
 * Source for the component `type` vocabulary: loa-freeside
 * themes/sietch/src/types/theme-component.types.ts (ComponentType union).
 */
export function renderThemeVerifyComponents(theme: Theme): unknown[] {
  // The verify page is the layout whose slug/name indicates verify; fall back
  // to the first page. config-protocol's PageLayout has slug + name.
  const verifyPage =
    theme.pages.find((p) => /verify/i.test(p.slug) || /verify/i.test(p.name)) ??
    theme.pages[0];
  if (!verifyPage) return [];
  return mapComponents(verifyPage.components);
}

function mapComponents(components: ReadonlyArray<ComponentInstance>): unknown[] {
  const out: unknown[] = [];
  for (const c of components) {
    mapOne(c, out);
  }
  return out;
}

function mapOne(c: ComponentInstance, out: unknown[]): void {
  switch (c.type) {
    case 'rich-text': {
      // `content` is markdown per config-protocol slot-schema; escape it so a
      // CM cannot inject formatting beyond what they typed literally.
      const content = c.props.content ?? c.props.text ?? '';
      const safe = cap(escapeDiscordMarkdown(content), TEXT_DISPLAY_MAX);
      if (safe.length > 0) out.push(textDisplay(safe));
      return;
    }
    case 'divider':
    case 'spacer': {
      out.push(separator());
      return;
    }
    case 'layout-container': {
      // Discord verify messages have no nested-container grammar; flatten the
      // children inline (V1). The container's own background/padding props are
      // CSS concepts with no Discord analogue — dropped.
      if (c.children && c.children.length > 0) {
        for (const child of c.children) mapOne(child, out);
      }
      return;
    }
    // button: the verify CTA is the renderer's OWN button (copy.buttonLabel +
    // the substrate verifyUrl), so a theme `button` component is NOT re-rendered
    // here — a CM-supplied button.action.url could point anywhere, and the
    // verify message's only sanctioned link target is the verify URL. Deferred.
    // image / nft-gallery / leaderboard / profile-card / token-gate: require
    // live data resolution unavailable on the pre-auth verify surface (V1 skip).
    default:
      return; // fail-soft: unknown / unsupported component → skipped, never throws.
  }
}
