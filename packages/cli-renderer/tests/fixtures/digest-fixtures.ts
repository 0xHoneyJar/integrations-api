/**
 * Digest fixtures for cli-renderer smoke tests.
 *
 * Per Sprint 3 R3.8 — exercise rendering against ruggy + satoshi (and
 * mongolian stub) digest voice samples. Covers:
 *
 *   - clean voice (already disciplined upstream)
 *   - voice attempting ANSI injection (caught by stripAnsi)
 *   - voice with Discord artifact (caught by assertNoDiscordArtifacts)
 */

import type { CliRenderInput } from "../../src/index.js";

export const RUGGY_DIGEST_FIXTURE: CliRenderInput = {
  voice:
    "big week in midi-watch. owsley showed up after a long quiet stretch. " +
    "the lab finally lit. this is the kind of grind that pays out.",
  persona: { id: "ruggy", displayName: "ruggy" },
  postType: "digest",
  meta: { zone: "midi-watch", computedAt: "2026-05-04T21:00:00Z" },
};

export const SATOSHI_DIGEST_FIXTURE: CliRenderInput = {
  voice:
    "the underworld grail surfaces. gemini #1606 carries pluto today. " +
    "tomorrow it carries mars. the codex is moving.",
  persona: { id: "satoshi", displayName: "satoshi" },
  postType: "digest",
  meta: { zone: "owsley-lab", computedAt: "2026-05-04T21:00:00Z" },
};

export const MONGOLIAN_MICRO_FIXTURE: CliRenderInput = {
  voice: "the road is long. take what is given. give what is asked.",
  persona: { id: "mongolian", displayName: "munkh" },
  postType: "micro",
};

export const WEAVER_FIXTURE: CliRenderInput = {
  voice:
    "across stonehenge and bear-cave the picture clears. the climbers in " +
    "el-dorado have moved to el-dorado proper. the watchers in owsley have " +
    "finished waiting.",
  persona: { id: "ruggy", displayName: "ruggy" },
  postType: "weaver",
  meta: { computedAt: "2026-05-04T21:00:00Z" },
};

// Fixtures that SHOULD trigger guards
export const VOICE_WITH_ANSI_INJECTION: CliRenderInput = {
  // Untrusted "voice" trying to inject CSI sequences (window-title escape,
  // SGR reset, alt-buffer switch). stripAnsi should remove all of these.
  voice:
    "hello\x1b[2J\x1b]0;PWNED\x07world\x1b[31mred\x1b[0m end",
  persona: { id: "ruggy", displayName: "ruggy" },
  postType: "micro",
};

export const VOICE_WITH_DISCORD_CUSTOM_EMOJI: CliRenderInput = {
  // Discord-only artifact — composer drift
  voice: "the lab is back <:lab_open:123456789012345678> watch close",
  persona: { id: "ruggy", displayName: "ruggy" },
  postType: "micro",
};
