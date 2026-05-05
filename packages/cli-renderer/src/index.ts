/**
 * `@0xhoneyjar/cli-renderer` — ANSI-text renderer for chat-medium
 * presentation registry.
 *
 * Per SDD §5.6 (cycle R · cmp-boundary-architecture · 2026-05-04).
 *
 * Second-medium proof: renders ruggy/satoshi/munkh digest+micro+weaver
 * fixtures into terminal-safe ANSI. Validates the L2 registry shape
 * generalizes beyond Discord.
 *
 * SECURITY (SKP-001 architectural fix): all renderers strip ANSI escapes
 * from untrusted voice text before wrapping in renderer-owned decorations.
 * Never trust LLM output with raw terminal sequences.
 *
 * Public API:
 *
 *   - renderDigest(input)  — long-form scheduled post
 *   - renderMicro(input)   — short reply
 *   - renderWeaver(input)  — cross-zone narrative
 *   - stripAnsi(text)      — ANSI escape sanitizer (also useful for unit tests)
 *   - containsAnsi(text)   — detection guard
 *   - assertNoDiscordArtifacts(text) — drift-catch (throws on Discord-only artifacts)
 *   - CliRenderInput       — input shape
 */

export { renderDigest, type CliRenderInput } from "./render-digest.js";
export { renderMicro } from "./render-micro.js";
export { renderWeaver } from "./render-weaver.js";
export { stripAnsi, containsAnsi } from "./sanitize-ansi.js";
export { assertNoDiscordArtifacts } from "./assert-no-discord-artifacts.js";

export const CLI_RENDERER_VERSION = "0.1.0" as const;
