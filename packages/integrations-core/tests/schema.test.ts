import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { RawEventEnvelope } from "../src/protocol/envelope.js";
import {
  MembershipChanged,
  MembershipObserved,
  MembershipRevoked,
} from "../src/protocol/observation.js";
import { Ignored, Projected, Quarantined } from "../src/protocol/disposition.js";
import { Committed, Conflict, Duplicate } from "../src/protocol/result.js";

const decodeEnv = Schema.decodeUnknownSync(RawEventEnvelope);
const validEnv = {
  provider: "discord",
  connectionId: "c",
  tenantId: "t",
  eventType: "GUILD_MEMBER_ADD",
  observedAt: "o",
  receivedAt: "r",
  sourceContractVersion: "v",
  payload: {},
};

describe("RawEventEnvelope constraints (§16.10)", () => {
  test("decodes a valid envelope", () => {
    const e = decodeEnv(validEnv);
    expect(e.provider).toBe("discord");
    expect(e.upstreamEventId).toBeUndefined();
  });

  test("rejects empty connectionId", () => {
    expect(() => decodeEnv({ ...validEnv, connectionId: "" })).toThrow();
  });

  test("rejects an unknown provider", () => {
    expect(() => decodeEnv({ ...validEnv, provider: "slack" })).toThrow();
  });

  test("rejects a malformed rawPayloadHash", () => {
    expect(() => decodeEnv({ ...validEnv, rawPayloadHash: "not-a-hash" })).toThrow();
  });
});

describe("observations (Tier-1 domain facts)", () => {
  const meta = {
    provider: "discord" as const,
    connectionId: "c",
    tenantId: "t",
    upstreamEventId: "u",
    observedAt: "o",
    externalAccountId: "discord:1",
    communityExternalId: "discord:guild:2",
  };

  test("MembershipObserved carries a role set", () => {
    const o = new MembershipObserved({ ...meta, roleExternalIds: ["discord:role:9"] });
    expect(o._tag).toBe("MembershipObserved");
    expect(o.roleExternalIds).toEqual(["discord:role:9"]);
  });

  test("MembershipChanged carries the current role set", () => {
    const o = new MembershipChanged({ ...meta, roleExternalIds: [] });
    expect(o._tag).toBe("MembershipChanged");
  });

  test("MembershipRevoked has no role set (leave/kick/ban indistinguishable)", () => {
    const o = new MembershipRevoked(meta);
    expect(o._tag).toBe("MembershipRevoked");
    expect("roleExternalIds" in o).toBe(false);
  });
});

describe("dispositions + results", () => {
  test("Quarantined persists a digest, never the raw payload (§11.5)", () => {
    const q = new Quarantined({
      reason: "malformed-payload",
      patchCandidate: true,
      payloadDigest: "a".repeat(64),
      eventType: "GUILD_MEMBER_ADD",
    });
    expect(q.payloadDigest).toMatch(/^[0-9a-f]{64}$/);
    expect("payload" in q).toBe(false);
  });

  test("Ignored carries a reason code + tier", () => {
    const i = new Ignored({ reason: "message-content-excluded", classification: "tier-3" });
    expect(i.classification).toBe("tier-3");
  });

  test("Projected wraps observations", () => {
    const p = new Projected({ observations: [] });
    expect(p._tag).toBe("Projected");
  });

  test("Conflict is a distinct terminal (§16.3)", () => {
    const c = new Conflict({
      idempotencyKey: "k",
      priorDigest: "a".repeat(64),
      newDigest: "b".repeat(64),
    });
    expect(c._tag).toBe("Conflict");
  });

  test("Committed carries composite idempotencyKey + optional upstreamEventId (§16.5)", () => {
    const c = new Committed({
      idempotencyKey: "t:discord:c:u",
      upstreamEventId: "u",
      disposition: new Projected({ observations: [] }),
    });
    expect(c.idempotencyKey).toBe("t:discord:c:u");
  });

  test("Duplicate carries the idempotencyKey", () => {
    const d = new Duplicate({ idempotencyKey: "t:discord:c:u" });
    expect(d._tag).toBe("Duplicate");
  });
});
