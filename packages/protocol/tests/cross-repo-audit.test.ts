/**
 * Cross-repo audit test — Sprint 3 R3.9 acceptance.
 *
 * Verifies that every CapabilityKey used in `hasCapability(...)` and
 * `pickCapability(...)` references EXISTS as a field on every descriptor
 * variant. Catches typo'd keys at test time rather than at consumer runtime.
 *
 * The mechanism: enumerate all CapabilityKey values from the type, then
 * verify each one is present (`in` operator) on each concrete descriptor.
 *
 * This catches:
 *   1. A consumer writing `hasCapability(d, 'stickerz')` (typo) —
 *      the type system catches this at the CALL site, but the audit test
 *      ALSO catches if a Schema field were ever desync from the descriptor
 *      const, e.g. if someone added a Schema literal but forgot to add
 *      the field to one descriptor's const literal.
 *   2. A new CapabilityKey added to one descriptor but not all —
 *      the architectural lock A3 ("uniform field set across variants") is
 *      enforced here at runtime.
 *
 * Per SDD §9.1 + cycle R sprint 3.
 */

import { describe, it, expect } from "bun:test";
import {
  DISCORD_WEBHOOK_DESCRIPTOR,
  DISCORD_INTERACTION_DESCRIPTOR,
  CLI_DESCRIPTOR,
  TELEGRAM_STUB,
  hasCapability,
  pickCapability,
  type CapabilityKey,
} from "../src/index.js";

// All CapabilityKey values that consumers MAY use. If consumers add new
// keys, they extend this list — the audit test then verifies every
// descriptor declares the new field.
//
// Sourced from the shared field set in capability.ts. If a key is added
// to one descriptor but not all, this list cannot type-check (CapabilityKey
// excludes any non-shared keys).
const ALL_CAPABILITY_KEYS: ReadonlyArray<CapabilityKey> = [
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

describe("Cross-repo audit — every CapabilityKey present on every descriptor", () => {
  for (const key of ALL_CAPABILITY_KEYS) {
    it(`DISCORD_WEBHOOK_DESCRIPTOR has '${key}'`, () => {
      expect(key in DISCORD_WEBHOOK_DESCRIPTOR).toBe(true);
    });

    it(`DISCORD_INTERACTION_DESCRIPTOR has '${key}'`, () => {
      expect(key in DISCORD_INTERACTION_DESCRIPTOR).toBe(true);
    });

    it(`CLI_DESCRIPTOR has '${key}'`, () => {
      expect(key in CLI_DESCRIPTOR).toBe(true);
    });

    it(`TELEGRAM_STUB has '${key}'`, () => {
      expect(key in TELEGRAM_STUB).toBe(true);
    });
  }
});

describe("Cross-repo audit — hasCapability behaves consistently per key on every descriptor", () => {
  // Smoke check: every key call returns a boolean (no thrown errors,
  // no undefined returns) regardless of descriptor variant.
  for (const key of ALL_CAPABILITY_KEYS) {
    it(`hasCapability(DISCORD_WEBHOOK, '${key}') returns boolean`, () => {
      expect(typeof hasCapability(DISCORD_WEBHOOK_DESCRIPTOR, key)).toBe(
        "boolean",
      );
    });

    it(`hasCapability(DISCORD_INTERACTION, '${key}') returns boolean`, () => {
      expect(typeof hasCapability(DISCORD_INTERACTION_DESCRIPTOR, key)).toBe(
        "boolean",
      );
    });

    it(`hasCapability(CLI, '${key}') returns boolean`, () => {
      expect(typeof hasCapability(CLI_DESCRIPTOR, key)).toBe("boolean");
    });

    it(`hasCapability(TELEGRAM_STUB, '${key}') returns boolean`, () => {
      expect(typeof hasCapability(TELEGRAM_STUB, key)).toBe("boolean");
    });
  }
});

describe("Cross-repo audit — pickCapability behaves consistently per key", () => {
  for (const key of ALL_CAPABILITY_KEYS) {
    it(`pickCapability(DISCORD_WEBHOOK, '${key}') returns defined`, () => {
      const v = pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, key);
      expect(v).toBeDefined();
    });

    it(`pickCapability(CLI, '${key}') returns defined`, () => {
      const v = pickCapability(CLI_DESCRIPTOR, key);
      expect(v).toBeDefined();
    });
  }
});

describe("Cross-repo audit — descriptor field count matches expected (architectural lock A3)", () => {
  it("DISCORD_WEBHOOK has _tag + 16 capability fields = 17 keys", () => {
    expect(Object.keys(DISCORD_WEBHOOK_DESCRIPTOR).length).toBe(17);
  });

  it("DISCORD_INTERACTION has _tag + 16 capability fields = 17 keys", () => {
    expect(Object.keys(DISCORD_INTERACTION_DESCRIPTOR).length).toBe(17);
  });

  it("CLI_DESCRIPTOR has _tag + 16 capability fields = 17 keys", () => {
    expect(Object.keys(CLI_DESCRIPTOR).length).toBe(17);
  });

  it("TELEGRAM_STUB has _tag + 16 capability fields = 17 keys", () => {
    expect(Object.keys(TELEGRAM_STUB).length).toBe(17);
  });
});

describe("Cross-repo audit — SKP-001 architectural fix locks", () => {
  // The whole point of v0.2.0: webhook and interaction MUST disagree on
  // exactly modal/ephemeral/slashCommand. These tests lock that contract
  // even if someone tries to "simplify" the descriptors back together.

  it("WEBHOOK and INTERACTION agree on text/embed/sticker", () => {
    const sharedKeys: ReadonlyArray<CapabilityKey> = [
      "text",
      "embed",
      "sticker",
      "embedFieldsMax",
      "attachment",
      "customEmoji",
      "thread",
      "reaction",
      "mention",
      "button",
    ];
    for (const k of sharedKeys) {
      expect(pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, k)).toBe(
        pickCapability(DISCORD_INTERACTION_DESCRIPTOR, k),
      );
    }
  });

  it("WEBHOOK and INTERACTION DISAGREE on modal", () => {
    expect(pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "modal")).toBe(false);
    expect(pickCapability(DISCORD_INTERACTION_DESCRIPTOR, "modal")).toBe(true);
  });

  it("WEBHOOK and INTERACTION DISAGREE on ephemeral", () => {
    expect(pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "ephemeral")).toBe(false);
    expect(pickCapability(DISCORD_INTERACTION_DESCRIPTOR, "ephemeral")).toBe(
      true,
    );
  });

  it("WEBHOOK and INTERACTION DISAGREE on slashCommand", () => {
    expect(pickCapability(DISCORD_WEBHOOK_DESCRIPTOR, "slashCommand")).toBe(
      false,
    );
    expect(pickCapability(DISCORD_INTERACTION_DESCRIPTOR, "slashCommand")).toBe(
      true,
    );
  });
});
