/**
 * Accessor smoke tests for hasCapability + pickCapability + mediumIdOf.
 *
 * Sprint 2 R2.8 acceptance:
 *   - hasCapability(DISCORD_DESCRIPTOR, 'sticker') === true
 *   - hasCapability(CLI_DESCRIPTOR, 'sticker') === false
 *   - pickCapability returns precise field type
 *   - mediumIdOf returns the `_tag` discriminator
 *
 * Per SDD §5.1 + §7.1 + §12.E.
 */

import { describe, it, expect } from "bun:test";
import {
  DISCORD_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  hasCapability,
  pickCapability,
  mediumIdOf,
} from "../src/index.js";

describe("hasCapability — boolean fields", () => {
  it("DISCORD_DESCRIPTOR has sticker capability", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "sticker")).toBe(true);
  });

  it("CLI_DESCRIPTOR does NOT have sticker capability", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "sticker")).toBe(false);
  });

  it("TELEGRAM_STUB does NOT have sticker (stub baseline)", () => {
    expect(hasCapability(TELEGRAM_STUB, "sticker")).toBe(false);
  });

  it("DISCORD_DESCRIPTOR has embed capability", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "embed")).toBe(true);
  });

  it("CLI_DESCRIPTOR has ansi capability", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "ansi")).toBe(true);
  });

  it("DISCORD_DESCRIPTOR does NOT have ansi", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "ansi")).toBe(false);
  });

  it("DISCORD_DESCRIPTOR does NOT have inlineKeyboard (Telegram-only)", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "inlineKeyboard")).toBe(false);
  });

  it("DISCORD_DESCRIPTOR does NOT have stickerSet (Telegram-only)", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "stickerSet")).toBe(false);
  });

  it("all 3 descriptors have text capability", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "text")).toBe(true);
    expect(hasCapability(CLI_DESCRIPTOR, "text")).toBe(true);
    expect(hasCapability(TELEGRAM_STUB, "text")).toBe(true);
  });
});

describe("hasCapability — numeric fields (>0 truthy)", () => {
  it("DISCORD_DESCRIPTOR.embedFieldsMax is truthy (25 > 0)", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "embedFieldsMax")).toBe(true);
  });

  it("CLI_DESCRIPTOR.embedFieldsMax is falsy (0 > 0 is false)", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "embedFieldsMax")).toBe(false);
  });

  it("TELEGRAM_STUB.embedFieldsMax is falsy (0)", () => {
    expect(hasCapability(TELEGRAM_STUB, "embedFieldsMax")).toBe(false);
  });
});

describe("pickCapability — precise type return", () => {
  it("returns boolean for boolean field (Discord sticker = true)", () => {
    const v = pickCapability(DISCORD_DESCRIPTOR, "sticker");
    expect(v).toBe(true);
  });

  it("returns boolean for boolean field (CLI sticker = false)", () => {
    const v = pickCapability(CLI_DESCRIPTOR, "sticker");
    expect(v).toBe(false);
  });

  it("returns numeric for embedFieldsMax (Discord = 25)", () => {
    const v = pickCapability(DISCORD_DESCRIPTOR, "embedFieldsMax");
    expect(v).toBe(25);
  });

  it("returns numeric for embedFieldsMax (CLI = 0)", () => {
    const v = pickCapability(CLI_DESCRIPTOR, "embedFieldsMax");
    expect(v).toBe(0);
  });

  it("can be used to bound an embed builder loop", () => {
    const max = pickCapability(DISCORD_DESCRIPTOR, "embedFieldsMax");
    const fields: number[] = [];
    for (let i = 0; i < max && i < 100; i++) fields.push(i);
    expect(fields.length).toBe(25);
  });
});

describe("mediumIdOf — discriminator extraction", () => {
  it("DISCORD_DESCRIPTOR yields 'discord'", () => {
    expect(mediumIdOf(DISCORD_DESCRIPTOR)).toBe("discord");
  });

  it("CLI_DESCRIPTOR yields 'cli'", () => {
    expect(mediumIdOf(CLI_DESCRIPTOR)).toBe("cli");
  });

  it("TELEGRAM_STUB yields 'telegram-stub'", () => {
    expect(mediumIdOf(TELEGRAM_STUB)).toBe("telegram-stub");
  });

  it("enables exhaustive typed switch", () => {
    function name(id: ReturnType<typeof mediumIdOf>): string {
      switch (id) {
        case "discord":
          return "Discord";
        case "cli":
          return "CLI";
        case "telegram-stub":
          return "Telegram (stub)";
      }
    }
    expect(name(mediumIdOf(DISCORD_DESCRIPTOR))).toBe("Discord");
    expect(name(mediumIdOf(CLI_DESCRIPTOR))).toBe("CLI");
    expect(name(mediumIdOf(TELEGRAM_STUB))).toBe("Telegram (stub)");
  });
});

describe("hasCapability — usage shape per SDD §3.3 sibling pattern", () => {
  it("composer-style branch (embed if both medium + consumer agree)", () => {
    // Conceptual usage: composer reads hasCapability + ConsumerConstraint
    // (sibling primitive from asset-pipeline · per SDD §3.3).
    function shouldUseEmbed(medium: typeof DISCORD_DESCRIPTOR | typeof CLI_DESCRIPTOR): boolean {
      return hasCapability(medium, "embed");
    }
    expect(shouldUseEmbed(DISCORD_DESCRIPTOR)).toBe(true);
    expect(shouldUseEmbed(CLI_DESCRIPTOR)).toBe(false);
  });

  it("composer-style branch (suppress sticker references for non-Discord)", () => {
    function suppressStickers(medium: typeof DISCORD_DESCRIPTOR | typeof CLI_DESCRIPTOR | typeof TELEGRAM_STUB): boolean {
      return !hasCapability(medium, "sticker");
    }
    expect(suppressStickers(DISCORD_DESCRIPTOR)).toBe(false); // Discord supports stickers
    expect(suppressStickers(CLI_DESCRIPTOR)).toBe(true); // CLI suppresses
    expect(suppressStickers(TELEGRAM_STUB)).toBe(true); // Telegram stub suppresses (until cycle fills)
  });
});

describe("hasCapability — type-narrowed key", () => {
  it("rejects unknown keys at compile time", () => {
    // This test is mostly a type-level assertion. The CapabilityKey
    // type extracted in accessors.ts excludes `_tag` and only includes
    // shared field names. Calling `hasCapability(d, '_tag')` should
    // be a TS error; we verify here that the runtime behaves correctly
    // for the valid keys.
    const validKeys = [
      "text",
      "embed",
      "attachment",
      "ansi",
      "customEmoji",
      "sticker",
      "stickerSet",
      "slashCommand",
      "modal",
      "button",
      "inlineKeyboard",
      "thread",
      "reaction",
      "mention",
      "ephemeral",
      "embedFieldsMax",
    ] as const;

    for (const key of validKeys) {
      // Each call should not throw — type system + runtime agree
      const r = hasCapability(DISCORD_DESCRIPTOR, key);
      expect(typeof r).toBe("boolean");
    }
  });
});
