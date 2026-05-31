/**
 * escape-discord.ts — the RENDER-SIDE escaping that C-5 owns.
 *
 * This is the render-side half of the C-1 RENDER-CONTRACT
 * (freeside-worlds/packages/config-protocol/RENDER-CONTRACT.md): the config
 * store emits CM-editable strings RAW-but-bounded; the rendering medium MUST
 * escape per-medium before output. For Discord that means escaping markdown
 * formatting characters so a community-manager's literal text renders as text,
 * never as injected formatting / mentions / links.
 *
 * ── Threat model (Discord side) ───────────────────────────────────────────
 * A CM edits `copy.title` / `copy.body` / `copy.buttonLabel` (and theme
 * component props) via the config-service. That text flows into a Discord
 * Components-V2 `TextDisplay.content` (markdown-rendered). Without escaping a
 * CM could:
 *   1. Inject formatting: `**bold**`, `_italic_`, `# heading`, `> quote`,
 *      `||spoiler||`, `[label](url)` masked links, `` ``` `` code fences.
 *   2. Inject a mention that pings: `@everyone`, `@here`, `<@id>`, `<@&role>`.
 *      (Discord ALSO blocks pings at the send layer via
 *      `allowed_mentions: { parse: [] }` — this is the defense-in-depth
 *      markdown-distortion + visual-spoof layer on top of that.)
 *   3. Spoof structure with `<...>`-shaped tokens (custom emoji, timestamps).
 *
 * NOTE — scope boundary (per the kickoff + RENDER-CONTRACT): this file handles
 * the DISCORD side only. The verify WEB PAGE HTML-escape path (`&`,`<`,`>`,`"`,
 * `'`) is a DIFFERENT sink owned by the verify-page renderer in loa-freeside
 * (finding arrakis-art2 F-001). A `</script>`-class XSS is not Discord-relevant
 * (Discord renders markdown, not HTML); Discord-markdown injection IS. Do not
 * conflate the two — escaping for one medium does not make a string safe for
 * the other (RENDER-CONTRACT "necessary but not sufficient").
 *
 * ── Why a fresh implementation, not an import ─────────────────────────────
 * freeside-characters has `escapeDiscordMarkdown` (persona-engine
 * deliver/sanitize.ts), but (a) it lives in a private app package not consumed
 * here, and (b) its placeholder-restore step relies on a PUA-range regex that
 * does not survive a clean source round-trip (the `/[-]/g` restore is a
 * mojibake of the intended PUA class). This module re-implements the SAME
 * placeholder strategy correctly and self-contained so the medium-render layer
 * owns its escaping without an app-package dependency.
 */

/**
 * Discord markdown formatting characters escaped OUTSIDE inline-code spans.
 * `_ * ~ |` cover italic/bold/underline, strikethrough, and spoilers.
 * `[ ]` cover the masked-link grammar `[text](url)` — escaping EITHER bracket
 * breaks Discord's link parsing, so a CM-supplied `[here](https://evil)` renders
 * as literal text instead of a LIVE clickable masked link (phishing vector on
 * the verify surface — BLOCKER-1). The renderer's OWN link button is built
 * structurally (ActionRow/Button), not via markdown, so this is harmless to it.
 * We do NOT escape backticks — they are the inline-code affordance and content
 * inside them is rendered verbatim by Discord (mobile tap-to-copy). The
 * negative-lookbehind `(?<!\\)` avoids double-escaping an already-escaped char.
 */
const FORMAT_CHARS = /(?<!\\)([_*~|[\]])/g;

/**
 * Structural `<...>` tokens that must survive VERBATIM (escaping their inner
 * underscores would break Discord's parser and render them as broken text):
 *   <:name:id> / <a:name:id>  — custom (animated) emoji
 *   <@id> / <@!id> / <@&id>   — user / role mentions
 *   <#id>                     — channel mention
 *   <t:unix> / <t:unix:f>     — timestamps
 *
 * These are pulled out to Private-Use-Area placeholders, escaping runs, then
 * they are restored unchanged. (They are still inert as PINGS because the send
 * layer sets `allowed_mentions: { parse: [] }`; preserving them keeps emoji +
 * timestamps that a theme legitimately embeds from rendering as broken text.)
 */
const PROTECTED_TOKEN = /<(a?:[A-Za-z0-9_]+:\d+|@[!&]?\d+|#\d+|t:\d+(?::[A-Za-z])?)>/g;

/**
 * Private-Use-Area base for placeholders (U+E000 block). These code points
 * never appear in normal CM text, carry no markdown format chars, and survive
 * the escape pass untouched.
 */
const PLACEHOLDER_BASE = 0xe000;
/**
 * Matches the PUA placeholder code points the token pull-out (Step 3) inserts
 * via `String.fromCodePoint(PLACEHOLDER_BASE + i)`. Written with explicit `\u`
 * escapes (NOT literal PUA chars) so the regex survives a source round-trip:
 * a literal-PUA class renders as a bare `[-]`-looking mojibake in editors and
 * reviews, and a copy-paste "cleanup" of that mojibake would silently narrow the
 * class to a single literal hyphen, leaving every protected token unrestored
 * (garbled render) AND corrupting literal hyphens in CM content. The range is
 * the full Unicode Private-Use-Area block (U+E000-U+F8FF), bounding any
 * placeholder index the pull-out can produce.
 */
const PLACEHOLDER_RE = /[\uE000-\uF8FF]/g;

/**
 * Escape Discord markdown in an untrusted-but-bounded CM string.
 *
 * Algorithm (mirrors the proven persona-engine strategy):
 *   1. Replace `@everyone` / `@here` with a zero-width-joiner break so the
 *      mass-ping keyword cannot form (belt-and-suspenders alongside the send
 *      layer's `allowed_mentions`). Done FIRST so the inserted ZWSP is not
 *      itself escaped.
 *   2. Strip leading-line block sigils (`#`/`>`/`-`/`*`) so a CM cannot smuggle
 *      a heading / quote / list block into a slot the renderer styles itself
 *      (HIGH-1). Folded in here — construction-true — so EVERY CM string gets
 *      uniform treatment and a caller cannot forget a field.
 *   3. Pull protected `<...>` tokens into PUA placeholders.
 *   4. Escape `_ * ~ | [ ]` OUTSIDE inline-code spans (split on backtick: even
 *      indices are outside-code, odd are inside-code → left verbatim).
 *   5. Restore the protected tokens by placeholder index.
 *
 * Idempotent for the format-char pass (the `(?<!\\)` guard prevents
 * double-escaping) and for the sigil-strip pass (re-stripping an already-
 * stripped line is a no-op). Pure; no I/O.
 */
export function escapeDiscordMarkdown(text: string): string {
  if (!text) return text;

  // Step 1: neutralize mass-ping keywords (insert a zero-width space after @).
  // `@​everyone` does not trigger a ping and reads identically.
  let out = text.replace(/@(everyone|here)/g, '@​$1');

  // Step 2: strip leading-line block sigils so a CM-supplied `#`/`>`/`-`/`*`
  // at line-start cannot render as a heading / quote / list. Folded in so
  // body / buttonLabel / theme rich-text all get it — not just the title.
  out = stripBlockSigils(out);

  // Step 3: pull protected tokens out into PUA placeholders.
  const protectedSegments: string[] = [];
  out = out.replace(PROTECTED_TOKEN, (match) => {
    const i = protectedSegments.length;
    protectedSegments.push(match);
    return String.fromCodePoint(PLACEHOLDER_BASE + i);
  });

  // Step 4: escape format chars OUTSIDE inline-code spans.
  out = out
    .split('`')
    .map((segment, idx) => (idx % 2 === 0 ? segment.replace(FORMAT_CHARS, '\\$1') : segment))
    .join('`');

  // Step 5: restore protected tokens verbatim by placeholder index.
  out = out.replace(PLACEHOLDER_RE, (ch) => {
    const i = ch.codePointAt(0)! - PLACEHOLDER_BASE;
    return protectedSegments[i] ?? '';
  });

  return out;
}

/**
 * Strip the leading `#`/`>`/`-`/`*` block-markdown sigils Discord treats as
 * structural at line-start (headings, quotes, list bullets).
 *
 * Operates per line. As of HIGH-1, this is folded INTO `escapeDiscordMarkdown`
 * (Step 2) so EVERY CM-editable string — title, body, buttonLabel, theme
 * rich-text — gets uniform treatment and a caller can never forget a field.
 * It stays exported for explicit use and unit assertions; the sigil-strip is
 * idempotent, so calling it before `escapeDiscordMarkdown` is harmless.
 */
export function stripBlockSigils(text: string): string {
  if (!text) return text;
  return text
    .split('\n')
    .map((line) => line.replace(/^(\s*)(?:#{1,3}\s|>\s|>>>\s|[-*+]\s)/, '$1'))
    .join('\n');
}

/**
 * Detection guard — true if the text still contains an UNESCAPED Discord
 * markdown format char outside inline code. Used by tests to assert the
 * escape pass actually fired (parity with cli-renderer's `containsAnsi`).
 */
export function containsUnescapedMarkdown(text: string): boolean {
  if (!text) return false;
  let found = false;
  text.split('`').forEach((segment, idx) => {
    if (idx % 2 !== 0) return; // inside inline code — not escaped, not a finding
    FORMAT_CHARS.lastIndex = 0;
    if (FORMAT_CHARS.test(segment)) found = true;
  });
  return found;
}
