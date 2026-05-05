/**
 * Weaver renderer — long-form narrative post (cross-zone synthesis).
 *
 * Per SDD §5.6 cli-renderer (cycle R · cmp-boundary-architecture).
 *
 * Header: bold persona id · "weaver" tag
 * Body:   ANSI-stripped voice
 * Footer: dim computed_at timestamp
 */

import { stripAnsi } from "./sanitize-ansi.js";
import { assertNoDiscordArtifacts } from "./assert-no-discord-artifacts.js";
import type { CliRenderInput } from "./render-digest.js";

export function renderWeaver(input: CliRenderInput): string {
  const safeVoice = stripAnsi(input.voice);
  assertNoDiscordArtifacts(safeVoice);

  const head = `\x1b[1m▌ ${input.persona.id} · weaver\x1b[0m`;
  const body = safeVoice;
  const foot = input.meta?.computedAt
    ? `\x1b[2m· ${input.meta.computedAt}\x1b[0m`
    : "";
  return [head, "", body, foot ? "" : "", foot].filter(Boolean).join("\n");
}
