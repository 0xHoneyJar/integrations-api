/**
 * cv2.ts — Discord Components-V2 type IDs + the message flag.
 *
 * Grounded in the cluster's canonical CV2 renders (the authoritative shapes
 * this package mirrors):
 *   · freeside-characters persona-engine deliver/enriched-render.ts
 *       Container(17) · TextDisplay(10) · Separator(14) · Section(9) ·
 *       Thumbnail(11) · IS_COMPONENTS_V2 = 1 << 15
 *   · freeside-characters persona-engine events/mint-announcement-render.ts
 *       MediaGallery(12)
 *
 * Source authority: Discord API message-components v2.
 *   https://discord.com/developers/docs/components/reference
 *
 * The renderer emits PLAIN JSON objects (typed `unknown[]` at the boundary,
 * exactly like enriched-render.ts) so the consumer can pass the array straight
 * to discord.js / a webhook body. These constants name the magic numbers.
 */

/** Discord message flag enabling Components V2 (1 << 15 = 32768). */
export const IS_COMPONENTS_V2 = 1 << 15;

/** Component type ids (Discord API). */
export const ComponentType = {
  /** Action row — holds buttons / selects. */
  ACTION_ROW: 1,
  /** Button. */
  BUTTON: 2,
  /** Section — text components + a single accessory (thumbnail or button). */
  SECTION: 9,
  /** Text display — markdown content. The CV2 successor to plain `content`. */
  TEXT_DISPLAY: 10,
  /** Thumbnail — section accessory image. */
  THUMBNAIL: 11,
  /** Media gallery — 1..N full-bleed images. */
  MEDIA_GALLERY: 12,
  /** Separator — visual divider (optional `divider` + `spacing`). */
  SEPARATOR: 14,
  /** Container — top-level grouping with an optional accent color. */
  CONTAINER: 17,
} as const;

/** Button styles (Discord API). Link buttons carry a `url` instead of a `custom_id`. */
export const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
} as const;

/** Separator spacing (Discord API): 1 = small, 2 = large. */
export const SeparatorSpacing = {
  SMALL: 1,
  LARGE: 2,
} as const;

// ─── Typed block builders (kept structural — emit plain objects) ──────────────

export interface TextDisplayBlock {
  type: typeof ComponentType.TEXT_DISPLAY;
  content: string;
}

export interface SeparatorBlock {
  type: typeof ComponentType.SEPARATOR;
  divider?: boolean;
  spacing?: number;
}

export interface MediaGalleryBlock {
  type: typeof ComponentType.MEDIA_GALLERY;
  items: ReadonlyArray<{ media: { url: string } }>;
}

export interface LinkButtonBlock {
  type: typeof ComponentType.BUTTON;
  style: typeof ButtonStyle.LINK;
  label: string;
  url: string;
}

export interface ActionRowBlock {
  type: typeof ComponentType.ACTION_ROW;
  components: ReadonlyArray<LinkButtonBlock>;
}

export interface ContainerBlock {
  type: typeof ComponentType.CONTAINER;
  accent_color?: number;
  components: ReadonlyArray<unknown>;
}

export const textDisplay = (content: string): TextDisplayBlock => ({
  type: ComponentType.TEXT_DISPLAY,
  content,
});

export const separator = (spacing: number = SeparatorSpacing.SMALL): SeparatorBlock => ({
  type: ComponentType.SEPARATOR,
  divider: true,
  spacing,
});

export const mediaGallery = (url: string): MediaGalleryBlock => ({
  type: ComponentType.MEDIA_GALLERY,
  items: [{ media: { url } }],
});

export const linkButton = (label: string, url: string): LinkButtonBlock => ({
  type: ComponentType.BUTTON,
  style: ButtonStyle.LINK,
  label,
  url,
});

export const actionRow = (
  components: ReadonlyArray<LinkButtonBlock>,
): ActionRowBlock => ({
  type: ComponentType.ACTION_ROW,
  components,
});

export const container = (
  components: ReadonlyArray<unknown>,
  accentColor?: number,
): ContainerBlock => ({
  type: ComponentType.CONTAINER,
  ...(accentColor !== undefined ? { accent_color: accentColor } : {}),
  components,
});
