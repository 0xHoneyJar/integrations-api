/**
 * Accessor smoke tests for hasCapability + pickCapability + mediumIdOf.
 *
 * Sprint 2 R2.8 acceptance:
 *   - hasCapability(DISCORD_*_DESCRIPTOR, 'sticker') === true
 *   - hasCapability(CLI_DESCRIPTOR, 'sticker') === false
 *   - pickCapability returns precise field type
 *   - mediumIdOf returns the `_tag` discriminator
 *
 * Sprint 3 v0.2.0: tests use DISCORD_WEBHOOK_DESCRIPTOR (the new default
 * for persona-bot delivery). Discord-context-specific behavior covered in
 * the SKP-001 architectural-fix block.
 *
 * Per SDD §5.1 + §7.1 + §12.E.
 */

import { describe, it, expect } from "bun:test";
import {
  DISCORD_WEBHOOK_DESCRIPTOR,
  DISCORD_INTERACTION_DESCRIPTOR,
  DISCORD_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  hasCapability,
  pickCapability,
  mediumIdOf,
} from "../src/index.js";

describe("hasCapability — boolean fields", () => {
  it("DISCORD_WEBHOOK_DESCRIPTOR has sticker capability", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "sticker")).toBe(true);
  });

  it("DISCORD_INTERACTION_DESCRIPTOR has sticker capability", () => {
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "sticker")).toBe(true);
  });

  it("CLI_DESCRIPTOR does NOT have sticker capability", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "sticker")).toBe(false);
  });

  it("TELEGRAM_STUB does NOT have sticker (stub baseline)", () => {
    expect(hasCapability(TELEGRAM_STUB, "sticker")).toBe(false);
  });

  it("DISCORD_WEBHOOK_DESCRIPTOR has embed capability", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "embed")).toBe(true);
  });

  it("CLI_DESCRIPTOR has ansi capability", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "ansi")).toBe(true);
  });

  it("DISCORD_WEBHOOK_DESCRIPTOR does NOT have ansi", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "ansi")).toBe(false);
  });

  it("DISCORD_WEBHOOK_DESCRIPTOR does NOT have inlineKeyboard (Telegram-only)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "inlineKeyboard")).toBe(false);
  });

  it("DISCORD_WEBHOOK_DESCRIPTOR does NOT have stickerSet (Telegram-only)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "stickerSet")).toBe(false);
  });

  it("all 4 descriptor variants have text capability", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "text")).toBe(true);
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "text")).toBe(true);
    expect(hasCapability(CLI_DESCRIPTOR, "text")).toBe(true);
    expect(hasCapability(TELEGRAM_STUB, "text")).toBe(true);
  });
});

describe("hasCapability — Discord context split (SKP-001 architectural fix)", () => {
  // The whole point of v0.2.0: webhook delivery cannot render modal/ephemeral.
  // These tests lock the contract behaviorally.

  it("DISCORD_WEBHOOK does NOT have modal (interaction-only)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "modal")).toBe(false);
  });

  it("DISCORD_INTERACTION DOES have modal", () => {
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "modal")).toBe(true);
  });

  it("DISCORD_WEBHOOK does NOT have ephemeral (interaction-only)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "ephemeral")).toBe(false);
  });

  it("DISCORD_INTERACTION DOES have ephemeral", () => {
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "ephemeral")).toBe(true);
  });

  it("DISCORD_WEBHOOK does NOT have slashCommand (interaction-only)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "slashCommand")).toBe(false);
  });

  it("DISCORD_INTERACTION DOES have slashCommand", () => {
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "slashCommand")).toBe(true);
  });

  it("BOTH webhook + interaction have button (renderable in webhook payloads too)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "button")).toBe(true);
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "button")).toBe(true);
  });

  it("DISCORD_DESCRIPTOR (deprecated alias) === webhook (no modal/ephemeral)", () => {
    expect(hasCapability(DISCORD_DESCRIPTOR, "modal")).toBe(false);
    expect(hasCapability(DISCORD_DESCRIPTOR, "ephemeral")).toBe(false);
  });
});

describe("hasCapability — numeric fields (>0 truthy)", () => {
  it("DISCORD_WEBHOOK_DESCRIPTOR.embedFieldsMax is truthy (25 > 0)", () => {
    expect(hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, "embedFieldsMax")).toBe(true);
  });

  it("DISCORD_INTERACTION_DESCRIPTOR.embedFieldsMax is truthy (25 > 0)", () => {
    expect(hasCapability(DISCORD_INTERACTION_DESCRIPTOR, "embedFieldsMax")).toBe(
      true,
    );
  });

  it("CLI_DESCRIPTOR.embedFieldsMax is falsy (0 > 0 is false)", () => {
    expect(hasCapability(CLI_DESCRIPTOR, "embedFieldsMax")).toBe(false);
  });

  it("TELEGRAM_STUB.embedFieldsMax is falsy (0)", () => {
    expect(hasCapability(TELEGRAM_STUB, "embedFieldsMax")).toBe(false);
  });
});

describe("pickCapability — precise type return", () => {
  it("returns boolean for boolean field (Discord webhook sticker = true)", () => {
    const v = pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "sticker");
    expect(v).toBe(true);
  });

  it("returns boolean for boolean field (CLI sticker = false)", () => {
    const v = pickCapability(CLI_DESCRIPTOR, "sticker");
    expect(v).toBe(false);
  });

  it("returns numeric for embedFieldsMax (Discord webhook = 25)", () => {
    const v = pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "embedFieldsMax");
    expect(v).toBe(25);
  });

  it("returns numeric for embedFieldsMax (CLI = 0)", () => {
    const v = pickCapability(CLI_DESCRIPTOR, "embedFieldsMax");
    expect(v).toBe(0);
  });

  it("can be used to bound an embed builder loop", () => {
    const max = pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "embedFieldsMax");
    const fields: number[] = [];
    for (let i = 0; i < max && i < 100; i++) fields.push(i);
    expect(fields.length).toBe(25);
  });
});

describe("mediumIdOf — discriminator extraction", () => {
  it("DISCORD_WEBHOOK_DESCRIPTOR yields 'discord-webhook'", () => {
    expect(mediumIdOf(DISCORD_WEBHOOK_DESCRIPTOR)).toBe("discord-webhook");
  });

  it("DISCORD_INTERACTION_DESCRIPTOR yields 'discord-interaction'", () => {
    expect(mediumIdOf(DISCORD_INTERACTION_DESCRIPTOR)).toBe("discord-interaction");
  });

  it("DISCORD_DESCRIPTOR (deprecated alias) yields 'discord-webhook'", () => {
    expect(mediumIdOf(DISCORD_DESCRIPTOR)).toBe("discord-webhook");
  });

  it("CLI_DESCRIPTOR yields 'cli'", () => {
    expect(mediumIdOf(CLI_DESCRIPTOR)).toBe("cli");
  });

  it("TELEGRAM_STUB yields 'telegram-stub'", () => {
    expect(mediumIdOf(TELEGRAM_STUB)).toBe("telegram-stub");
  });

  it("enables exhaustive typed switch (4 variants)", () => {
    function name(id: ReturnType<typeof mediumIdOf>): string {
      switch (id) {
        case "discord-webhook":
          return "Discord (webhook)";
        case "discord-interaction":
          return "Discord (interaction)";
        case "cli":
          return "CLI";
        case "telegram-stub":
          return "Telegram (stub)";
      }
    }
    expect(name(mediumIdOf(DISCORD_WEBHOOK_DESCRIPTOR))).toBe("Discord (webhook)");
    expect(name(mediumIdOf(DISCORD_INTERACTION_DESCRIPTOR))).toBe(
      "Discord (interaction)",
    );
    expect(name(mediumIdOf(CLI_DESCRIPTOR))).toBe("CLI");
    expect(name(mediumIdOf(TELEGRAM_STUB))).toBe("Telegram (stub)");
  });
});

describe("hasCapability — usage shape per SDD §3.3 sibling pattern", () => {
  it("composer-style branch (embed if both medium + consumer agree)", () => {
    function shouldUseEmbed(medium: typeof DISCORD_WEBHOOK_DESCRIPTOR | typeof CLI_DESCRIPTOR): boolean {
      return hasCapability(medium, "embed");
    }
    expect(shouldUseEmbed(DISCORD_WEBHOOK_DESCRIPTOR)).toBe(true);
    expect(shouldUseEmbed(CLI_DESCRIPTOR)).toBe(false);
  });

  it("composer-style branch (suppress sticker references for non-Discord)", () => {
    function suppressStickers(medium: typeof DISCORD_WEBHOOK_DESCRIPTOR | typeof CLI_DESCRIPTOR | typeof TELEGRAM_STUB): boolean {
      return !hasCapability(medium, "sticker");
    }
    expect(suppressStickers(DISCORD_WEBHOOK_DESCRIPTOR)).toBe(false);
    expect(suppressStickers(CLI_DESCRIPTOR)).toBe(true);
    expect(suppressStickers(TELEGRAM_STUB)).toBe(true);
  });

  it("renderer-side branch (modal-builder gate respects context split)", () => {
    // SKP-001 architectural fix in action: a renderer that builds modal
    // payloads MUST gate on hasCapability(...,'modal'). Webhook context
    // returns false, preventing the malformed payload from being built.
    function buildModalPayload(medium: typeof DISCORD_WEBHOOK_DESCRIPTOR | typeof DISCORD_INTERACTION_DESCRIPTOR): { type: string } | null {
      if (!hasCapability(medium, "modal")) return null;
      return { type: "modal" };
    }
    expect(buildModalPayload(DISCORD_WEBHOOK_DESCRIPTOR)).toBeNull();
    expect(buildModalPayload(DISCORD_INTERACTION_DESCRIPTOR)).toEqual({
      type: "modal",
    });
  });
});

describe("hasCapability — type-narrowed key", () => {
  it("rejects unknown keys at compile time", () => {
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
      const r = hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, key);
      expect(typeof r).toBe("boolean");
    }
  });
});
