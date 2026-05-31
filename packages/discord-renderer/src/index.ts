/**
 * `@0xhoneyjar/discord-renderer` — Theme → Discord Components-V2 renderer.
 *
 * The render-side half of the C-1 RENDER-CONTRACT (bead arrakis-4re1 / C-5):
 * reads a raw-but-bounded SurfaceConfig (freeside-worlds config-protocol) and
 * ESCAPES every CM-editable string for Discord markdown before emitting a
 * Components-V2 components array. The config store stores raw-but-bounded; this
 * package owns the per-medium escaping.
 *
 * Sibling of `@0xhoneyjar/cli-renderer` in the freeside-mediums medium-render
 * family — same Effect-era cluster conventions, different target medium. The
 * sealed medium-capability registry (`@0xhoneyjar/medium-registry`) describes
 * WHAT Discord can render; this package DOES the rendering.
 *
 * V1 surface: `verify-message` (the verify / wallet-linking message a community
 * sees before linking). Additional surfaces are additive minor bumps.
 *
 * Public API:
 *
 *   renderVerifyMessageToDiscord(input)  — SurfaceConfig → CV2 components + flag
 *   renderThemeVerifyComponents(theme)   — Theme verify-page components → CV2 blocks
 *   escapeDiscordMarkdown(text)          — the render-side Discord escaper
 *   stripBlockSigils(text)               — strip leading #/>/- block sigils
 *   containsUnescapedMarkdown(text)      — detection guard (tests)
 *   readSurfaceConfig(world, surface, o) — typed read seam vs the config-service
 *   parseAccentColor(hex)                — theme accent → Discord int (fail-soft)
 *   cv2 builders + ComponentType/ButtonStyle/IS_COMPONENTS_V2
 *   config-types (Theme / SurfaceConfig / VerifyMessageConfig …)
 */

export {
  renderVerifyMessageToDiscord,
  renderThemeVerifyComponents,
  type RenderVerifyMessageInput,
  type RenderVerifyMessageOutput,
} from './render-verify-message.js';

export {
  escapeDiscordMarkdown,
  stripBlockSigils,
  containsUnescapedMarkdown,
} from './escape-discord.js';

export { parseAccentColor, DEFAULT_ACCENT } from './theme-color.js';

export {
  readSurfaceConfig,
  type ConfigClientOptions,
  type ConfigReadResult,
  type ConfigReadOk,
  type ConfigReadMiss,
  type ConfigReadBody,
} from './config-client.js';

export {
  IS_COMPONENTS_V2,
  ComponentType,
  ButtonStyle,
  SeparatorSpacing,
  textDisplay,
  separator,
  mediaGallery,
  linkButton,
  actionRow,
  container,
  type TextDisplayBlock,
  type SeparatorBlock,
  type MediaGalleryBlock,
  type LinkButtonBlock,
  type ActionRowBlock,
  type ContainerBlock,
} from './cv2.js';

export type {
  Theme,
  ThemeBranding,
  PageLayout,
  ComponentInstance,
  ComponentProps,
  FontSpec,
  VerifyMessageConfig,
  VerifyMessageCopy,
  Surface,
  SurfaceConfig,
  SurfaceConfigMap,
} from './config-types.js';

export { SURFACE_CONFIG_SCHEMA_VERSION } from './config-types.js';

export const DISCORD_RENDERER_VERSION = '0.1.0' as const;
