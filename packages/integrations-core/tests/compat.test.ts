/**
 * Compatibility gate (AC-2 / AC-3, FR-13): @0xhoneyjar/medium-registry — the
 * presentation-capability domain — must remain source-compatible and unchanged
 * through this evolution. This test imports it as a downstream consumer would.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import {
  CLI_DESCRIPTOR,
  DISCORD_INTERACTION_DESCRIPTOR,
  DISCORD_WEBHOOK_DESCRIPTOR,
  hasCapability,
  MEDIUM_REGISTRY_VERSION,
  MediumCapability,
} from "@0xhoneyjar/medium-registry";

describe("@0xhoneyjar/medium-registry compatibility", () => {
  test("version is unchanged (0.2.0) — additive-only, no breaking bump (AC-3)", () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dir, "../../protocol/package.json"), "utf8"),
    );
    expect(pkg.version).toBe("0.2.0");
    expect(MEDIUM_REGISTRY_VERSION).toBe("0.2.0");
  });

  test("public descriptor singletons + accessor still resolve (AC-2)", () => {
    expect(DISCORD_WEBHOOK_DESCRIPTOR._tag).toBe("discord-webhook");
    expect(DISCORD_INTERACTION_DESCRIPTOR._tag).toBe("discord-interaction");
    expect(CLI_DESCRIPTOR._tag).toBe("cli");
    expect(typeof hasCapability).toBe("function");
  });

  test("MediumCapability schema still decodes a descriptor", () => {
    const decoded = Schema.decodeUnknownSync(MediumCapability)(DISCORD_WEBHOOK_DESCRIPTOR);
    expect(decoded._tag).toBe("discord-webhook");
  });
});
