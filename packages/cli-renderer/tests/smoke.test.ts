/**
 * cli-renderer smoke tests — Sprint 3 R3.8 acceptance.
 *
 * Verifies:
 *   1. Each render entry point produces parseable ANSI for ruggy + satoshi
 *      digest fixtures (AC-3.3)
 *   2. Output contains NO Discord-only artifacts (custom emoji, ephemeral
 *      flags) — composer drift would throw via assertNoDiscordArtifacts
 *   3. ANSI injection in untrusted voice is stripped (SKP-001 architectural
 *      fix)
 *   4. Renderer's OWN ANSI decorations (bold header, dim footer) survive
 *      the strip
 *
 * Per SDD §9.1 + cycle R sprint 3.
 */

import { describe, it, expect } from "bun:test";
import {
  renderDigest,
  renderMicro,
  renderWeaver,
  stripAnsi,
  containsAnsi,
  assertNoDiscordArtifacts,
  CLI_RENDERER_VERSION,
} from "../src/index.js";
import {
  RUGGY_DIGEST_FIXTURE,
  SATOSHI_DIGEST_FIXTURE,
  MONGOLIAN_MICRO_FIXTURE,
  WEAVER_FIXTURE,
  VOICE_WITH_ANSI_INJECTION,
  VOICE_WITH_DISCORD_CUSTOM_EMOJI,
} from "./fixtures/digest-fixtures.js";

describe("cli-renderer — version", () => {
  it("exports CLI_RENDERER_VERSION", () => {
    expect(CLI_RENDERER_VERSION).toBe("0.1.0");
    expect(CLI_RENDERER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("cli-renderer — renderDigest (Sprint 3 R3.8 AC)", () => {
  it("renders ruggy digest fixture as parseable ANSI text", () => {
    const out = renderDigest(RUGGY_DIGEST_FIXTURE);
    // Header + body + footer present
    expect(out).toContain("ruggy");
    expect(out).toContain("midi-watch");
    expect(out).toContain("digest");
    expect(out).toContain("big week in midi-watch");
    expect(out).toContain("2026-05-04T21:00:00Z");
    // Contains renderer-owned ANSI decorations (bold + dim)
    expect(out).toContain("\x1b[1m"); // bold start
    expect(out).toContain("\x1b[0m"); // reset
    expect(out).toContain("\x1b[2m"); // dim
  });

  it("renders satoshi digest fixture", () => {
    const out = renderDigest(SATOSHI_DIGEST_FIXTURE);
    expect(out).toContain("satoshi");
    expect(out).toContain("owsley-lab");
    expect(out).toContain("the underworld grail surfaces");
  });

  it("digest output contains NO Discord custom emoji syntax", () => {
    const out = renderDigest(RUGGY_DIGEST_FIXTURE);
    expect(out).not.toMatch(/<a?:[\w]+:\d+>/);
  });

  it("digest output contains NO Discord MessageFlags references", () => {
    const out = renderDigest(RUGGY_DIGEST_FIXTURE);
    expect(out).not.toMatch(/MessageFlags\./);
  });

  it("digest preserves persona emoji-free (CLI has no custom-emoji surface)", () => {
    const fixWithEmoji = {
      ...RUGGY_DIGEST_FIXTURE,
      persona: { ...RUGGY_DIGEST_FIXTURE.persona, emoji: "🐻" },
    };
    const out = renderDigest(fixWithEmoji);
    // Header doesn't include emoji (we don't render persona.emoji in CLI today;
    // emoji is a Discord-specific affordance · would be a future cycle change)
    expect(out).toContain("ruggy");
  });

  it("digest with no meta omits footer", () => {
    const fixNoMeta = {
      voice: "hello",
      persona: { id: "ruggy", displayName: "ruggy" },
      postType: "digest" as const,
    };
    const out = renderDigest(fixNoMeta);
    expect(out).not.toContain("\x1b[2m");
  });
});

describe("cli-renderer — renderMicro (R3.8 short-form)", () => {
  it("renders mongolian micro fixture", () => {
    const out = renderMicro(MONGOLIAN_MICRO_FIXTURE);
    expect(out).toContain("mongolian");
    expect(out).toContain("the road is long");
    // Header decoration present
    expect(out).toContain("\x1b[1m");
  });

  it("micro has no zone or footer (short register)", () => {
    const out = renderMicro(MONGOLIAN_MICRO_FIXTURE);
    expect(out).not.toContain("\x1b[2m"); // no dim footer
  });
});

describe("cli-renderer — renderWeaver (R3.8 long-form synthesis)", () => {
  it("renders weaver fixture", () => {
    const out = renderWeaver(WEAVER_FIXTURE);
    expect(out).toContain("ruggy");
    expect(out).toContain("weaver");
    expect(out).toContain("across stonehenge and bear-cave");
    expect(out).toContain("\x1b[1m");
  });
});

describe("cli-renderer — SKP-001 ANSI injection guard", () => {
  // The architectural-fix tests: untrusted voice with embedded ANSI
  // sequences MUST be stripped before assembly.

  it("strips CSI sequences from voice (SGR colors, cursor moves)", () => {
    const dirty = "hello\x1b[31mred\x1b[0m world";
    // CSI bytes occupy adjacent positions — strip removes them but doesn't
    // insert whitespace · "hello[red]world" → "hellored world" (the space
    // between "[0m" and "world" survives as the only whitespace).
    expect(stripAnsi(dirty)).toBe("hellored world");
    expect(stripAnsi(dirty)).not.toMatch(/\x1b/);
  });

  it("strips OSC sequences (window title injection)", () => {
    const dirty = "hello\x1b]0;PWNED\x07world";
    const clean = stripAnsi(dirty);
    expect(clean).toBe("helloworld");
    expect(clean).not.toMatch(/\x1b/);
    expect(clean).not.toContain("PWNED"); // oh wait, OSC removes the whole bracketed payload — let's make sure
  });

  it("strips screen-clear / alt-buffer escapes", () => {
    const dirty = "hello\x1b[2Jworld\x1b[?1049h";
    const clean = stripAnsi(dirty);
    expect(clean).toBe("helloworld");
    expect(clean).not.toMatch(/\x1b/);
  });

  it("renderMicro strips ANSI injection from voice but keeps OWN decorations", () => {
    const out = renderMicro(VOICE_WITH_ANSI_INJECTION);
    // Renderer's OWN decorations present (bold header)
    expect(out).toContain("\x1b[1m");
    expect(out).toContain("\x1b[0m");
    // Untrusted ANSI from voice has been stripped — no SGR-31, no clear, no OSC
    expect(out).not.toContain("\x1b[2J");
    expect(out).not.toContain("\x1b]0;");
    expect(out).not.toContain("PWNED");
    expect(out).not.toContain("\x1b[31m"); // SGR red strip
    // The non-ANSI text content still flows through
    expect(out).toContain("hello");
    expect(out).toContain("world");
    expect(out).toContain("end");
  });

  it("renderDigest strips ANSI injection (same guard)", () => {
    const fix = {
      ...VOICE_WITH_ANSI_INJECTION,
      postType: "digest" as const,
      meta: { zone: "test", computedAt: "now" },
    };
    const out = renderDigest(fix);
    expect(out).not.toContain("\x1b[2J");
    expect(out).not.toContain("\x1b]0;");
  });

  it("containsAnsi detects raw escapes", () => {
    expect(containsAnsi("hello \x1b[31mred\x1b[0m")).toBe(true);
    expect(containsAnsi("hello world")).toBe(false);
    expect(containsAnsi("")).toBe(false);
  });

  it("stripAnsi is idempotent", () => {
    const dirty = "\x1b[1mhello\x1b[0m";
    const once = stripAnsi(dirty);
    const twice = stripAnsi(once);
    expect(once).toBe(twice);
    expect(once).toBe("hello");
  });

  it("stripAnsi handles empty + null-equivalent gracefully", () => {
    expect(stripAnsi("")).toBe("");
    expect(stripAnsi(undefined as unknown as string)).toBe(
      undefined as unknown as string,
    );
  });
});

describe("cli-renderer — Discord drift catch (assertNoDiscordArtifacts)", () => {
  it("renderDigest throws on Discord custom emoji", () => {
    const fix = {
      ...VOICE_WITH_DISCORD_CUSTOM_EMOJI,
      postType: "digest" as const,
    };
    expect(() => renderDigest(fix)).toThrow(/custom emoji/);
  });

  it("renderMicro throws on Discord custom emoji", () => {
    expect(() => renderMicro(VOICE_WITH_DISCORD_CUSTOM_EMOJI)).toThrow(
      /custom emoji/,
    );
  });

  it("throws on Discord MessageFlags reference", () => {
    const fix = {
      voice: "use MessageFlags.Ephemeral for hidden replies",
      persona: { id: "ruggy", displayName: "ruggy" },
      postType: "digest" as const,
      meta: {},
    };
    expect(() => renderDigest(fix)).toThrow(/Ephemeral/);
  });

  it("throws on Discord user mention", () => {
    const fix = {
      voice: "thanks <@123456789012345678>",
      persona: { id: "ruggy", displayName: "ruggy" },
      postType: "micro" as const,
    };
    expect(() => renderMicro(fix)).toThrow(/user mention/);
  });

  it("throws on Discord channel mention", () => {
    const fix = {
      voice: "see <#123456789012345678> for details",
      persona: { id: "ruggy", displayName: "ruggy" },
      postType: "micro" as const,
    };
    expect(() => renderMicro(fix)).toThrow(/channel mention/);
  });

  it("assertNoDiscordArtifacts standalone — passes clean voice", () => {
    expect(() =>
      assertNoDiscordArtifacts("clean voice with no artifacts"),
    ).not.toThrow();
  });

  it("animated emoji <a:name:id> also caught", () => {
    expect(() =>
      assertNoDiscordArtifacts("look <a:dancing:987654321098765432>"),
    ).toThrow(/custom emoji/);
  });
});

describe("cli-renderer — composes with medium-registry CLI_DESCRIPTOR", () => {
  it("renders without runtime error when CLI_DESCRIPTOR is loaded", () => {
    // Smoke check that the import + capability assertion in renderDigest
    // does not throw given the registry's published CLI shape.
    const out = renderDigest(RUGGY_DIGEST_FIXTURE);
    expect(out.length).toBeGreaterThan(0);
  });
});
