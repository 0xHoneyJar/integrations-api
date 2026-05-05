/**
 * Round-trip decode tests for MediumCapability discriminated union.
 *
 * Sprint 2 R2.8 acceptance: Schema.decodeUnknownSync() succeeds for each
 * descriptor variant; rejects malformed input; preserves all field values
 * through round-trip.
 *
 * Sprint 3 v0.2.0 ADDS Discord context split — Webhook + Interaction
 * variants get round-trip + narrow-validation coverage.
 *
 * Per SDD §9.1 + architect lock A2 (sealed Union discriminated by `_tag`).
 */

import { describe, it, expect } from "bun:test";
import { Schema } from "effect";
import {
  MediumCapability,
  DISCORD_WEBHOOK_DESCRIPTOR,
  DISCORD_INTERACTION_DESCRIPTOR,
  DISCORD_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  DiscordWebhookSchema,
  DiscordInteractionSchema,
  DiscordSchema,
  CliSchema,
  TelegramSchema,
  MEDIUM_REGISTRY_VERSION,
} from "../src/index.js";

describe("MediumCapability — version", () => {
  it("exports MEDIUM_REGISTRY_VERSION as semver string", () => {
    expect(MEDIUM_REGISTRY_VERSION).toBe("0.2.0");
    expect(typeof MEDIUM_REGISTRY_VERSION).toBe("string");
    expect(MEDIUM_REGISTRY_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("MediumCapability — round-trip decode (sealed Union)", () => {
  it("decodes DISCORD_WEBHOOK_DESCRIPTOR", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(
      DISCORD_WEBHOOK_DESCRIPTOR,
    );
    expect(decoded._tag).toBe("discord-webhook");
    expect(decoded.text).toBe(true);
    expect(decoded.embed).toBe(true);
    expect(decoded.sticker).toBe(true);
    expect(decoded.embedFieldsMax).toBe(25);
    expect(decoded.ansi).toBe(false);
    expect(decoded.inlineKeyboard).toBe(false);
    // SKP-001 architectural fix: webhook context cannot deliver modal/ephemeral
    expect(decoded.modal).toBe(false);
    expect(decoded.ephemeral).toBe(false);
    expect(decoded.slashCommand).toBe(false);
    // BUT button is renderable in webhook payloads
    expect(decoded.button).toBe(true);
  });

  it("decodes DISCORD_INTERACTION_DESCRIPTOR", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(
      DISCORD_INTERACTION_DESCRIPTOR,
    );
    expect(decoded._tag).toBe("discord-interaction");
    expect(decoded.text).toBe(true);
    expect(decoded.embed).toBe(true);
    expect(decoded.sticker).toBe(true);
    expect(decoded.embedFieldsMax).toBe(25);
    // Interaction context: ALL Discord interactive caps available
    expect(decoded.modal).toBe(true);
    expect(decoded.ephemeral).toBe(true);
    expect(decoded.slashCommand).toBe(true);
    expect(decoded.button).toBe(true);
  });

  it("DISCORD_DESCRIPTOR (deprecated alias) === DISCORD_WEBHOOK_DESCRIPTOR", () => {
    // Back-compat: DISCORD_DESCRIPTOR resolves to webhook context (the
    // safer default for v0.1.0 consumers · most were persona-bot-shaped).
    expect(DISCORD_DESCRIPTOR).toBe(DISCORD_WEBHOOK_DESCRIPTOR);
    const decoded = Schema.decodeUnknownSync(MediumCapability)(DISCORD_DESCRIPTOR);
    expect(decoded._tag).toBe("discord-webhook");
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
    const malformed = { ...DISCORD_WEBHOOK_DESCRIPTOR, _tag: "unknown-medium" };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects legacy `discord` _tag (split into webhook + interaction in v0.2.0)", () => {
    // The bare `discord` literal was REMOVED in v0.2.0 · neither webhook
    // nor interaction variant accepts it. Catches stale producers.
    const malformed = { ...DISCORD_WEBHOOK_DESCRIPTOR, _tag: "discord" };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects Discord webhook descriptor with modal=true (SKP-001 lock)", () => {
    // The whole architectural rationale: modal cannot be true on webhook.
    // If a consumer accidentally sets modal: true on a webhook descriptor,
    // schema decode rejects it.
    const malformed = { ...DISCORD_WEBHOOK_DESCRIPTOR, modal: true };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects Discord webhook descriptor with ephemeral=true (SKP-001 lock)", () => {
    const malformed = { ...DISCORD_WEBHOOK_DESCRIPTOR, ephemeral: true };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects Discord interaction descriptor with modal=false (interaction MUST support modal)", () => {
    const malformed = { ...DISCORD_INTERACTION_DESCRIPTOR, modal: false };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects Discord descriptor with wrong literal value", () => {
    // Discord must have embedFieldsMax=25. Different value rejects.
    const malformed = { ...DISCORD_WEBHOOK_DESCRIPTOR, embedFieldsMax: 100 };
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects descriptor missing required field", () => {
    const { _tag, text, ...partial } = DISCORD_WEBHOOK_DESCRIPTOR;
    const malformed = { _tag, ...partial }; // missing text
    expect(() => Schema.decodeUnknownSync(MediumCapability)(malformed)).toThrow();
  });

  it("rejects null + undefined", () => {
    expect(() => Schema.decodeUnknownSync(MediumCapability)(null)).toThrow();
    expect(() => Schema.decodeUnknownSync(MediumCapability)(undefined)).toThrow();
  });

  it("preserves all field values through round-trip (Discord webhook)", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(
      DISCORD_WEBHOOK_DESCRIPTOR,
    );
    expect(decoded).toEqual(DISCORD_WEBHOOK_DESCRIPTOR);
  });

  it("preserves all field values through round-trip (Discord interaction)", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(
      DISCORD_INTERACTION_DESCRIPTOR,
    );
    expect(decoded).toEqual(DISCORD_INTERACTION_DESCRIPTOR);
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
  it("DiscordWebhookSchema decodes webhook descriptor", () => {
    const decoded = Schema.decodeUnknownSync(DiscordWebhookSchema)(
      DISCORD_WEBHOOK_DESCRIPTOR,
    );
    expect(decoded._tag).toBe("discord-webhook");
  });

  it("DiscordWebhookSchema rejects interaction descriptor", () => {
    expect(() =>
      Schema.decodeUnknownSync(DiscordWebhookSchema)(DISCORD_INTERACTION_DESCRIPTOR),
    ).toThrow();
  });

  it("DiscordInteractionSchema decodes interaction descriptor", () => {
    const decoded = Schema.decodeUnknownSync(DiscordInteractionSchema)(
      DISCORD_INTERACTION_DESCRIPTOR,
    );
    expect(decoded._tag).toBe("discord-interaction");
  });

  it("DiscordInteractionSchema rejects webhook descriptor", () => {
    expect(() =>
      Schema.decodeUnknownSync(DiscordInteractionSchema)(DISCORD_WEBHOOK_DESCRIPTOR),
    ).toThrow();
  });

  it("DiscordSchema (deprecated alias) decodes webhook descriptor", () => {
    // Deprecated alias points at webhook for back-compat
    const decoded = Schema.decodeUnknownSync(DiscordSchema)(DISCORD_WEBHOOK_DESCRIPTOR);
    expect(decoded._tag).toBe("discord-webhook");
  });

  it("CliSchema rejects Discord webhook descriptor", () => {
    expect(() =>
      Schema.decodeUnknownSync(CliSchema)(DISCORD_WEBHOOK_DESCRIPTOR),
    ).toThrow();
  });

  it("TelegramSchema rejects CLI descriptor", () => {
    expect(() => Schema.decodeUnknownSync(TelegramSchema)(CLI_DESCRIPTOR)).toThrow();
  });
});

describe("MediumCapability — descriptor invariants (architect lock A3)", () => {
  it("DISCORD_WEBHOOK_DESCRIPTOR is the sole singleton (referential equality)", () => {
    expect(DISCORD_WEBHOOK_DESCRIPTOR).toBe(DISCORD_WEBHOOK_DESCRIPTOR);
  });

  it("DISCORD_INTERACTION_DESCRIPTOR is the sole singleton", () => {
    expect(DISCORD_INTERACTION_DESCRIPTOR).toBe(DISCORD_INTERACTION_DESCRIPTOR);
  });

  it("descriptors have correct discriminators", () => {
    expect(DISCORD_WEBHOOK_DESCRIPTOR._tag).toBe("discord-webhook");
    expect(DISCORD_INTERACTION_DESCRIPTOR._tag).toBe("discord-interaction");
    expect(CLI_DESCRIPTOR._tag).toBe("cli");
    expect(TELEGRAM_STUB._tag).toBe("telegram-stub");
  });
});

describe("MediumCapability — discriminator narrowing", () => {
  it("type narrows on webhook _tag check", () => {
    const desc: typeof DISCORD_WEBHOOK_DESCRIPTOR = DISCORD_WEBHOOK_DESCRIPTOR;
    if (desc._tag === "discord-webhook") {
      expect(desc.embedFieldsMax).toBe(25);
      expect(desc.modal).toBe(false); // webhook narrowing locks modal=false
    }
  });

  it("type narrows on interaction _tag check", () => {
    const desc: typeof DISCORD_INTERACTION_DESCRIPTOR =
      DISCORD_INTERACTION_DESCRIPTOR;
    if (desc._tag === "discord-interaction") {
      expect(desc.embedFieldsMax).toBe(25);
      expect(desc.modal).toBe(true); // interaction narrowing locks modal=true
    }
  });

  it("exhaustive switch covers all 4 variants", () => {
    function getMediumName(
      d:
        | typeof DISCORD_WEBHOOK_DESCRIPTOR
        | typeof DISCORD_INTERACTION_DESCRIPTOR
        | typeof CLI_DESCRIPTOR
        | typeof TELEGRAM_STUB,
    ): string {
      switch (d._tag) {
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
    expect(getMediumName(DISCORD_WEBHOOK_DESCRIPTOR)).toBe("Discord (webhook)");
    expect(getMediumName(DISCORD_INTERACTION_DESCRIPTOR)).toBe(
      "Discord (interaction)",
    );
    expect(getMediumName(CLI_DESCRIPTOR)).toBe("CLI");
    expect(getMediumName(TELEGRAM_STUB)).toBe("Telegram (stub)");
  });
});
