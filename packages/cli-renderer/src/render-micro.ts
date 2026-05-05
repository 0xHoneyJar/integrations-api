/**
 * Micro renderer — short-form post / one-on-one reply (≤3 sentences per
 * discord-native-register).
 *
 * Per SDD §5.6 cli-renderer (cycle R · cmp-boundary-architecture).
 *
 * Header: bold persona id (no zone for ad-hoc replies)
 * Body:   ANSI-stripped voice
 * Footer: omitted (micro register is brief)
 */

import { stripAnsi } from "./sanitize-ansi.js";
import { assertNoDiscordArtifacts } from "./assert-no-discord-artifacts.js";
import type { CliRenderInput } from "./render-digest.js";

export function renderMicro(input: CliRenderInput): string {
  const safeVoice = stripAnsi(input.voice);
  assertNoDiscordArtifacts(safeVoice);

  const head = `\x1b[1m· ${input.persona.id}\x1b[0m`;
  return [head, safeVoice].join("\n");
}
