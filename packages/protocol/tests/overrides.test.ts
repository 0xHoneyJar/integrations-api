/**
 * MediumCapabilityOverrides + TokenBinding tests.
 *
 * Sprint 2 R2.7 + R2.8 acceptance — validates the override + binding shapes
 * that Sprint 4 + cycle-3 consume.
 *
 * Per SDD §3.2 + §6.1 + architect lock A6 (cross-cycle handoff pattern).
 */

import { describe, it, expect } from "bun:test";
import { Schema } from "effect";
import {
  TokenBinding,
  MediumCapabilityOverrides,
} from "../src/index.js";
import type { CharacterMediumBinding } from "../src/index.js";

describe("TokenBinding — Effect Schema validation", () => {
  it("decodes a valid binding (lowercase contract + numeric tokenId)", () => {
    const valid = {
      contract: "0x1234567890abcdef1234567890abcdef12345678",
      tokenId: "507",
    };
    const decoded = Schema.decodeUnknownSync(TokenBinding)(valid);
    expect(decoded.contract).toBe(valid.contract);
    expect(decoded.tokenId).toBe(valid.tokenId);
    expect(decoded.resolverHint).toBeUndefined();
  });

  it("decodes mixed-case contract (the pattern is case-insensitive hex)", () => {
    const valid = {
      contract: "0xFc2DA9D1C9f2C77FA0fa7c6A0b7c6E8f5A1B23Da",
      tokenId: "1",
    };
    const decoded = Schema.decodeUnknownSync(TokenBinding)(valid);
    expect(decoded.contract).toBe(valid.contract);
  });

  it("decodes with resolverHint", () => {
    const valid = {
      contract: "0x1234567890abcdef1234567890abcdef12345678",
      tokenId: "507",
      resolverHint: "manifest-document" as const,
    };
    const decoded = Schema.decodeUnknownSync(TokenBinding)(valid);
    expect(decoded.resolverHint).toBe("manifest-document");
  });

  it("supports u256-safe tokenId (string for big numbers)", () => {
    // 2^160 - far exceeds Number.MAX_SAFE_INTEGER (~2^53)
    const valid = {
      contract: "0x1234567890abcdef1234567890abcdef12345678",
      tokenId: "1461501637330902918203684832716283019655932542976",
    };
    const decoded = Schema.decodeUnknownSync(TokenBinding)(valid);
    expect(decoded.tokenId).toBe(valid.tokenId);
  });

  it("rejects malformed contract (missing 0x prefix)", () => {
    const malformed = {
      contract: "1234567890abcdef1234567890abcdef12345678",
      tokenId: "1",
    };
    expect(() => Schema.decodeUnknownSync(TokenBinding)(malformed)).toThrow();
  });

  it("rejects malformed contract (wrong length)", () => {
    const malformed = {
      contract: "0x12",
      tokenId: "1",
    };
    expect(() => Schema.decodeUnknownSync(TokenBinding)(malformed)).toThrow();
  });

  it("rejects empty tokenId", () => {
    const malformed = {
      contract: "0x1234567890abcdef1234567890abcdef12345678",
      tokenId: "",
    };
    expect(() => Schema.decodeUnknownSync(TokenBinding)(malformed)).toThrow();
  });

  it("rejects unknown resolverHint values", () => {
    const malformed = {
      contract: "0x1234567890abcdef1234567890abcdef12345678",
      tokenId: "1",
      resolverHint: "alchemy-rpc",
    };
    expect(() => Schema.decodeUnknownSync(TokenBinding)(malformed)).toThrow();
  });
});

describe("MediumCapabilityOverrides — sparse Record shape", () => {
  it("decodes empty override map", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapabilityOverrides)({});
    expect(decoded).toEqual({});
  });

  it("decodes single-medium override (Discord only)", () => {
    const overrides = {
      discord: { sticker: false, embedFieldsMax: 10 },
    };
    const decoded = Schema.decodeUnknownSync(MediumCapabilityOverrides)(overrides);
    expect(decoded.discord).toBeDefined();
    expect((decoded.discord as Record<string, unknown>).sticker).toBe(false);
  });

  it("decodes multi-medium overrides", () => {
    const overrides = {
      discord: { sticker: false },
      cli: { ansi: false },
      "telegram-stub": { text: true },
    };
    const decoded = Schema.decodeUnknownSync(MediumCapabilityOverrides)(overrides);
    expect(decoded.discord).toBeDefined();
    expect(decoded.cli).toBeDefined();
    expect(decoded["telegram-stub"]).toBeDefined();
  });

  it("decodes sparse override (only one field per medium)", () => {
    // The Sprint 4 wardrobe-resolver consumer expects sparse — character
    // overrides only the Discord sticker disable, inherits everything else.
    const overrides = {
      discord: { sticker: false },
    };
    const decoded = Schema.decodeUnknownSync(MediumCapabilityOverrides)(overrides);
    expect(Object.keys(decoded.discord as object).length).toBe(1);
  });
});

describe("CharacterMediumBinding — composite shape (Sprint 4 forward dep)", () => {
  it("supports both fields optional (default)", () => {
    const binding: CharacterMediumBinding = {};
    expect(binding.mediumOverrides).toBeUndefined();
    expect(binding.tokenBinding).toBeUndefined();
  });

  it("supports per-character overrides only (default tier)", () => {
    const binding: CharacterMediumBinding = {
      mediumOverrides: {
        discord: { sticker: false },
      },
    };
    expect(binding.mediumOverrides).toBeDefined();
    expect(binding.tokenBinding).toBeUndefined();
  });

  it("supports per-token binding only (override tier)", () => {
    const binding: CharacterMediumBinding = {
      tokenBinding: {
        contract: "0x1234567890abcdef1234567890abcdef12345678",
        tokenId: "507",
      },
    };
    expect(binding.mediumOverrides).toBeUndefined();
    expect(binding.tokenBinding).toBeDefined();
  });

  it("supports both tiers together (per-character default + per-token override)", () => {
    const binding: CharacterMediumBinding = {
      mediumOverrides: {
        discord: { sticker: false },
      },
      tokenBinding: {
        contract: "0x1234567890abcdef1234567890abcdef12345678",
        tokenId: "507",
        resolverHint: "manifest-document",
      },
    };
    expect(binding.mediumOverrides).toBeDefined();
    expect(binding.tokenBinding).toBeDefined();
  });
});
