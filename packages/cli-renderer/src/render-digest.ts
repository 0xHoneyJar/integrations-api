/**
 * Digest renderer — long-form scheduled post (150-220 words per
 * discord-native-register).
 *
 * Per SDD §5.6 cli-renderer (cycle R · cmp-boundary-architecture).
 *
 * Header: bold persona id · zone · post type
 * Body:   ANSI-stripped voice (drift-catch + injection guard)
 * Footer: dim computed_at timestamp
 */

import { hasCapability, CLI_DESCRIPTOR } from "@0xhoneyjar/medium-registry";
import { stripAnsi } from "./sanitize-ansi.js";
import { assertNoDiscordArtifacts } from "./assert-no-discord-artifacts.js";

export interface CliRenderInput {
  /** Already-disciplined voice (Sprint 1 transforms applied upstream) */
  readonly voice: string;
  readonly persona: { readonly id: string; readonly displayName: string; readonly emoji?: string };
  readonly postType: "digest" | "micro" | "weaver";
  readonly meta?: { readonly zone?: string; readonly computedAt?: string };
}

/**
 * Render a digest as ANSI-formatted text.
 *
 * SECURITY (SKP-001 fix): `input.voice` is stripped of ANSI escapes before
 * wrapping. Renderer's OWN decorations (bold header, dim footer) are
 * inserted AFTER the strip.
 *
 * DRIFT CATCH: throws if voice contains Discord-only artifacts (custom emoji
 * `<:name:id>`, ephemeral flag references). Means the upstream composer
 * failed to honor `MediumCapability.CLI` and emitted Discord-shaped text
 * for a CLI delivery.
 */
export function renderDigest(input: CliRenderInput): string {
  // Assertion: registry shape declares text + ansi only — no rich payloads.
  if (!hasCapability(CLI_DESCRIPTOR, "ansi")) {
    throw new Error("cli-renderer requires MediumCapability.CLI ansi=true");
  }
  // Strip ANSI from voice BEFORE assembling (SKP-001 architectural fix)
  const safeVoice = stripAnsi(input.voice);
  // Drift catch — Discord-only artifacts in CLI rendering = composer bug
  assertNoDiscordArtifacts(safeVoice);

  const head =
    `\x1b[1m▌ ${input.persona.id} · ${input.meta?.zone ?? "-"} · ${input.postType}\x1b[0m`;
  const body = safeVoice;
  const foot = input.meta?.computedAt
    ? `\x1b[2m· ${input.meta.computedAt}\x1b[0m`
    : "";
  return [head, "", body, foot ? "" : "", foot].filter(Boolean).join("\n");
}
