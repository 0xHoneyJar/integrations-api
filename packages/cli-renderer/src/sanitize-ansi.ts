/**
 * ANSI escape sequence sanitizer — terminal injection guard.
 *
 * Per Cycle R Sprint 3 SKP-001 CRITICAL architectural fix.
 *
 * Threat model:
 *   LLM output (`input.voice` to renderers) is untrusted text. An LLM may
 *   produce raw ANSI escape sequences accidentally (rare) or via prompt
 *   injection (more concerning). If the renderer wraps untrusted text in
 *   its own ANSI decorations and prints to stdout, the untrusted ANSI
 *   sequences can:
 *     1. Reset terminal state (CUP, clear screen, alt-buffer switch)
 *     2. Set window title (OSC 0/1/2)
 *     3. Inject control sequences that downstream tools reinterpret
 *     4. On vulnerable terminals (older xterm), execute privileged escape
 *        codes (DECSED, sixel, font-loading) — though most modern
 *        terminals filter these
 *
 * Defense:
 *   Strip ALL ANSI escape sequences from untrusted text before assembling
 *   into renderer output. The renderer's OWN decorative escapes (bold
 *   header, dim footer) are inserted on the OUTSIDE of stripped voice.
 *
 * Pattern:
 *   ESC ([\x1b\x9b]) followed by either:
 *     - CSI: '[' + parameter chars (0-9; <=>?) + intermediate (space/!/"...) + final (@-~)
 *     - OSC: ']' + ANY chars + (BEL '\x07' OR ESC '\\' (ST))
 *     - Single-char escape: ESC + (e.g. =, >, c)
 *
 * Reference: ECMA-48 + xterm CSI/OSC sequences.
 */

/**
 * Regex matching ANSI escape sequences.
 *
 * - `\x1b` is ESC (the start byte)
 * - `\x9b` is the alternative CSI introducer (8-bit single-byte version)
 *
 * Three sequence shapes:
 *   1. CSI: `ESC [` followed by 0+ parameter bytes (0x30-0x3F),
 *      0+ intermediate bytes (0x20-0x2F), one final byte (0x40-0x7E)
 *   2. OSC: `ESC ]` followed by ANY chars terminated by BEL (\x07) or ST (ESC \\)
 *   3. Single-char escape: `ESC` followed by a single byte from 0x40-0x5A
 *      (commonly `\x1b=`, `\x1bc`, `\x1b>`, etc.)
 */
const ANSI_ESCAPE_PATTERN = new RegExp(
  [
    // CSI sequences (most common: SGR for colors, cursor moves)
    "[\\x1b\\x9b][\\[]([0-9;<=>?]*)[\\x20-\\x2f]*[\\x40-\\x7e]",
    // OSC sequences (window title, hyperlinks) — terminated by BEL or ST
    "[\\x1b\\x9b][\\]][^\\x07\\x1b]*(?:\\x07|\\x1b\\\\)",
    // Single-char escapes (DEC private modes, charset switches)
    "[\\x1b][@-Z\\\\-_]",
  ].join("|"),
  "g",
);

/**
 * Strip all ANSI escape sequences from text. Idempotent.
 *
 * Use BEFORE wrapping untrusted text in renderer-owned ANSI decorations.
 */
export function stripAnsi(text: string): string {
  if (!text) return text;
  return text.replace(ANSI_ESCAPE_PATTERN, "");
}

/**
 * Detect whether text contains ANY ANSI escape. Use for assertion guards
 * (e.g. cli-renderer's drift-catch tests verifying that upstream stripping
 * worked).
 */
export function containsAnsi(text: string): boolean {
  if (!text) return false;
  // Reset lastIndex on the global regex (defensive).
  ANSI_ESCAPE_PATTERN.lastIndex = 0;
  return ANSI_ESCAPE_PATTERN.test(text);
}
