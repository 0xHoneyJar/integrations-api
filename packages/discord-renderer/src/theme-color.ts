/**
 * theme-color.ts — Theme branding color → Discord container accent int.
 *
 * Discord's Container `accent_color` is a 24-bit RGB integer (0x000000..
 * 0xFFFFFF). A Jani Theme stores `branding.colors.accent` as a CM-editable
 * string (config-protocol `BoundedString` — length-capped + control-byte-free,
 * but NOT format-validated as a hex color: a CM could type `"hotpink"` or
 * garbage). This is a render-side concern (the store stores raw-but-bounded),
 * so parsing + fail-soft fallback lives HERE.
 */

/** Default accent when a theme has no usable accent color (Mibera owsley-lab purple). */
export const DEFAULT_ACCENT = 0x6f4ea1;

const HEX6 = /^#?([0-9a-fA-F]{6})$/;
const HEX3 = /^#?([0-9a-fA-F]{3})$/;

/**
 * Parse a theme accent color string to a Discord 24-bit int. Accepts
 * `#RRGGBB`, `RRGGBB`, `#RGB`, `RGB`. Returns `fallback` (default
 * `DEFAULT_ACCENT`) for anything it cannot parse — fail-soft, never throws:
 * a malformed CM color must never break the whole render.
 */
export function parseAccentColor(input: string | undefined, fallback = DEFAULT_ACCENT): number {
  if (!input) return fallback;
  const trimmed = input.trim();

  const m6 = HEX6.exec(trimmed);
  if (m6) return parseInt(m6[1]!, 16);

  const m3 = HEX3.exec(trimmed);
  if (m3) {
    // Expand shorthand #RGB → #RRGGBB.
    const [r, g, b] = m3[1]!.split('');
    return parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }

  return fallback;
}
