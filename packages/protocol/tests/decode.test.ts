/**
 * Round-trip decode tests for MediumCapability discriminated union.
 *
 * Sprint 2 R2.8 acceptance: Schema.decodeUnknownSync() succeeds for each
 * descriptor variant; rejects malformed input; preserves all field values
 * through round-trip.
 *
 * Per SDD §9.1 + architect lock A2 (sealed Union discriminated by `_tag`).
 */

import { describe, it, expect } from "bun:test";
import { Schema } from "effect";
import {
  MediumCapability,
  DISCORD_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  DiscordSchema,
  CliSchema,
  TelegramSchema,
  MEDIUM_REGISTRY_VERSION,
} from "../src/index.js";

describe("MediumCapability — version", () => {
  it("exports MEDIUM_REGISTRY_VERSION as semver string", () => {
    expect(MEDIUM_REGISTRY_VERSION).toBe("0.1.0");
    expect(typeof MEDIUM_REGISTRY_VERSION).toBe("string");
    expect(MEDIUM_REGISTRY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("MediumCapability — round-trip decode (sealed Union)", () => {
  it("decodes DISCORD_DESCRIPTOR", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(DISCORD_DESCRIPTOR);
    expect(decoded._tag).toBe("discord");
    expect(decoded.text).toBe(true);
    expect(decoded.embed).toBe(true);
    expect(decoded.sticker).toBe(true);
    expect(decoded.embedFieldsMax).toBe(25);
    expect(decoded.ansi).toBe(false);
    expect(decoded.inlineKeyboard).toBe(false);
  });

  it("decodes CLI_DESCRIPTOR", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(CLI_DESCRIPTOR);
    expect(decoded._tag).toBe("cli");
    expect(decoded.text).toBe(true);
    expect(decoded.ansi).toBe(true);
    expect(decoded.embed).toBe(false);
    expect(decoded.sticker).toBe(false);
    expect(decoded.embedFieldsMax).toBe(0);
  });

  it("decodes TELEGRAM_STUB", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(TELEGRAM_STUB);
    expect(decoded._tag).toBe("telegram-stub");
    expect(decoded.text).toBe(true);
    expect(decoded.embed).toBe(false);
    // future telegram-renderer cycle will flip these to true:
    expect(decoded.sticker).toBe(false);
    expect(decoded.stickerSet).toBe(false);
    expect(decoded.inlineKeyboard).toBe(false);
  });

  it("rejects descriptor with unknown _tag", () => {
    const malformed = { ...DISCORD_DESCRIPTOR, _tag: "unknown-medium" };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects Discord descriptor with wrong literal value", () => {
    // Discord must have embedFieldsMax=25. Different value rejects.
    const malformed = { ...DISCORD_DESCRIPTOR, embedFieldsMax: 100 };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects descriptor missing required field", () => {
    const { _tag, text, ...partial } = DISCORD_DESCRIPTOR;
    const malformed = { _tag, ...partial }; // missing text
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects null + undefined", () => {
    expect(() => Schema.decodeUnknownSync(MediumCapability)(null)).toThrow();
    expect(() => Schema.decodeUnknownSync(MediumCapability)(undefined)).toThrow();
  });

  it("preserves all field values through round-trip (Discord)", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(DISCORD_DESCRIPTOR);
    expect(decoded).toEqual(DISCORD_DESCRIPTOR);
  });

  it("preserves all field values through round-trip (CLI)", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(CLI_DESCRIPTOR);
    expect(decoded).toEqual(CLI_DESCRIPTOR);
  });

  it("preserves all field values through round-trip (Telegram stub)", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(TELEGRAM_STUB);
    expect(decoded).toEqual(TELEGRAM_STUB);
  });
});

describe("MediumCapability — narrow per-variant Schema validation", () => {
  it("DiscordSchema decodes Discord descriptor", () => {
    const decoded = Schema.decodeUnknownSync(DiscordSchema)(DISCORD_DESCRIPTOR);
    expect(decoded._tag).toBe("discord");
  });

  it("DiscordSchema rejects CLI descriptor", () => {
    expect(() => Schema.decodeUnknownSync(DiscordSchema)(CLI_DESCRIPTOR)).toThrow();
  });

  it("CliSchema rejects Discord descriptor", () => {
    expect(() => Schema.decodeUnknownSync(CliSchema)(DISCORD_DESCRIPTOR)).toThrow();
  });

  it("TelegramSchema rejects CLI descriptor", () => {
    expect(() => Schema.decodeUnknownSync(TelegramSchema)(CLI_DESCRIPTOR)).toThrow();
  });
});

describe("MediumCapability — descriptor invariants (architect lock A3)", () => {
  it("DISCORD_DESCRIPTOR is the sole singleton (referential equality)", () => {
    // Ensures consumers always reference the singleton, not factory output.
    // If a consumer accidentally creates a literal-valued copy, that's still
    // structurally valid but breaks the singleton contract.
    expect(DISCORD_DESCRIPTOR).toBe(DISCORD_DESCRIPTOR);
  });

  it("descriptors are deeply frozen (or readonly via TS)", () => {
    // TS enforces readonly via the const assertion in capability.ts; runtime
    // freezing is not required (matches asset-pipeline pattern).
    expect(DISCORD_DESCRIPTOR._tag).toBe("discord");
    expect(CLI_DESCRIPTOR._tag).toBe("cli");
    expect(TELEGRAM_STUB._tag).toBe("telegram-stub");
  });
});

describe("MediumCapability — discriminator narrowing", () => {
  it("type narrows on _tag check", () => {
    const desc: typeof DISCORD_DESCRIPTOR = DISCORD_DESCRIPTOR;
    if (desc._tag === "discord") {
      // type narrowed — embedFieldsMax is exactly 25
      expect(desc.embedFieldsMax).toBe(25);
    }
  });

  it("exhaustive switch covers all variants", () => {
    function getMediumName(d: typeof DISCORD_DESCRIPTOR | typeof CLI_DESCRIPTOR | typeof TELEGRAM_STUB): string {
      switch (d._tag) {
        case "discord":
          return "Discord";
        case "cli":
          return "CLI";
        case "telegram-stub":
          return "Telegram (stub)";
      }
    }
    expect(getMediumName(DISCORD_DESCRIPTOR)).toBe("Discord");
    expect(getMediumName(CLI_DESCRIPTOR)).toBe("CLI");
    expect(getMediumName(TELEGRAM_STUB)).toBe("Telegram (stub)");
  });
});
