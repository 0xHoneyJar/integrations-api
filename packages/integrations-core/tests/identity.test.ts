import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import {
  canonicalDigest,
  idempotencyKey,
  quarantineKey,
  safeDigest,
  stableStringify,
} from "../src/identity.js";
import { RawEventEnvelope } from "../src/protocol/envelope.js";

const decode = Schema.decodeUnknownSync(RawEventEnvelope);

// Base envelope WITHOUT upstreamEventId (add per-test to exercise both branches).
const base = {
  provider: "discord",
  connectionId: "conn-1",
  tenantId: "tenant-A",
  eventType: "GUILD_MEMBER_ADD",
  observedAt: "2026-07-15T00:00:00Z",
  receivedAt: "2026-07-15T00:00:01Z",
  sourceContractVersion: "discord@v10",
  payload: { guild_id: "g", user: { id: "u" }, roles: [] },
} as const;

describe("idempotencyKey (§16.1/§16.2)", () => {
  test("includes tenantId → tenant∷provider∷conn∷id", () => {
    const e = decode({ ...base, upstreamEventId: "evt-1" });
    expect(idempotencyKey(e)).toBe("tenant-A:discord:conn-1:evt-1");
  });

  test("two tenants sharing a connectionId produce DISTINCT keys", () => {
    const a = decode({ ...base, tenantId: "tenant-A", upstreamEventId: "evt-1" });
    const b = decode({ ...base, tenantId: "tenant-B", upstreamEventId: "evt-1" });
    expect(idempotencyKey(a)).not.toBe(idempotencyKey(b));
  });

  test("absent upstreamEventId → null (no content-fallback key)", () => {
    const e = decode(base);
    expect(idempotencyKey(e)).toBeNull();
  });
});

describe("canonicalDigest (§16.9/§17.8)", () => {
  test("deterministic + key-order independent", () => {
    expect(canonicalDigest({ a: 1, b: 2 })).toBe(canonicalDigest({ b: 2, a: 1 }));
  });

  test("nested key-order independence", () => {
    expect(canonicalDigest({ x: { p: 1, q: 2 } })).toBe(
      canonicalDigest({ x: { q: 2, p: 1 } }),
    );
  });

  test("distinct payloads → distinct digests", () => {
    expect(canonicalDigest({ a: 1 })).not.toBe(canonicalDigest({ a: 2 }));
  });

  test("array order is preserved (not sorted)", () => {
    expect(canonicalDigest([1, 2])).not.toBe(canonicalDigest([2, 1]));
  });

  test("emits lowercase sha256 hex", () => {
    expect(canonicalDigest({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  test("rejects non-serializable input (bigint)", () => {
    expect(() => canonicalDigest({ x: 1n })).toThrow();
  });
});

describe("safeDigest + quarantineKey (§17.2/§17.8)", () => {
  test("safeDigest never throws on non-serializable input", () => {
    expect(safeDigest({ x: 1n })).toMatch(/^[0-9a-f]{64}$/);
  });

  test("quarantine identity is namespaced away from event keys", () => {
    const k = quarantineKey("discord", "tenant-A", "conn-1", "a".repeat(64));
    expect(k.startsWith("quarantine:")).toBe(true);
    expect(k).not.toContain("GUILD_MEMBER_ADD");
  });

  test("stableStringify sorts keys", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});
