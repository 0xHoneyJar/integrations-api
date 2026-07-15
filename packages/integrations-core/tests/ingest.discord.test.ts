import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import {
  Committed,
  DiscordAdapterRegistryLayer,
  Duplicate,
  InMemoryIngestionStoreLayer,
  type IngestionResult,
  ingestUnknown,
  MembershipObserved,
  MembershipRevoked,
  Projected,
  Quarantined,
} from "../src/index.js";

const layer = Layer.merge(InMemoryIngestionStoreLayer, DiscordAdapterRegistryLayer);

const run = (input: unknown) =>
  Effect.runPromise(ingestUnknown(input).pipe(Effect.provide(layer)));
const runSeq = (inputs: unknown[]) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const out: IngestionResult[] = [];
      for (const i of inputs) out.push(yield* ingestUnknown(i));
      return out;
    }).pipe(Effect.provide(layer)),
  );

// deterministic placeholders — NO secrets, NO real user payloads (AC-7)
const env = (eventType: string, payload: unknown, id = "delivery-1") => ({
  provider: "discord",
  connectionId: "conn-test-0001",
  tenantId: "tenant-test-0001",
  eventType,
  upstreamEventId: id, // transport-assigned delivery id (§17.1)
  observedAt: "2026-07-15T00:00:00Z",
  receivedAt: "2026-07-15T00:00:01Z",
  sourceContractVersion: "discord@v10",
  payload,
});

const memberAdd = { guild_id: "guild-1", user: { id: "user-1" }, roles: ["role-9"] };

describe("Discord vertical — full disposition matrix (AC-4/AC-5, FR-7/8/9)", () => {
  test("GUILD_MEMBER_ADD → committed MembershipObserved", async () => {
    const r = (await run(env("GUILD_MEMBER_ADD", memberAdd))) as Committed;
    expect(r._tag).toBe("Committed");
    const obs = (r.disposition as Projected).observations[0] as MembershipObserved;
    expect(obs._tag).toBe("MembershipObserved");
    expect(obs.externalAccountId).toBe("discord:user-1");
    expect(obs.communityExternalId).toBe("discord:guild:guild-1");
    expect(obs.roleExternalIds).toEqual(["discord:role:role-9"]);
  });

  test("GUILD_MEMBER_UPDATE → committed MembershipChanged", async () => {
    const r = (await run(env("GUILD_MEMBER_UPDATE", memberAdd))) as Committed;
    expect((r.disposition as Projected).observations[0]?._tag).toBe("MembershipChanged");
  });

  test("GUILD_MEMBER_REMOVE → committed MembershipRevoked (no role set)", async () => {
    const r = (await run(
      env("GUILD_MEMBER_REMOVE", { guild_id: "guild-1", user: { id: "user-1" } }),
    )) as Committed;
    const obs = (r.disposition as Projected).observations[0] as MembershipRevoked;
    expect(obs._tag).toBe("MembershipRevoked");
    expect("roleExternalIds" in obs).toBe(false);
  });

  test("MESSAGE_CREATE → committed Ignored{message-content-excluded}", async () => {
    const r = (await run(env("MESSAGE_CREATE", { content: "hi" }))) as Committed;
    expect(r.disposition._tag).toBe("Ignored");
    expect((r.disposition as { reason: string }).reason).toBe("message-content-excluded");
  });

  test("unknown event → committed Quarantined{unclassified-event}", async () => {
    const r = (await run(env("CHANNEL_PINS_UPDATE", { channel_id: "x" }))) as Committed;
    const d = r.disposition as Quarantined;
    expect(d.reason).toBe("unclassified-event");
    expect(d.patchCandidate).toBe(true);
  });

  test("malformed GUILD_MEMBER_ADD (missing user) → Quarantined{malformed-payload} — cannot disappear (AC-5)", async () => {
    const r = (await run(env("GUILD_MEMBER_ADD", { guild_id: "guild-1", roles: [] }))) as Committed;
    const d = r.disposition as Quarantined;
    expect(d._tag).toBe("Quarantined");
    expect(d.reason).toBe("malformed-payload");
  });

  test("re-delivery of the same event → Duplicate (idempotent)", async () => {
    const [a, b] = (await runSeq([
      env("GUILD_MEMBER_ADD", memberAdd),
      env("GUILD_MEMBER_ADD", memberAdd),
    ])) as [Committed, Duplicate];
    expect(a._tag).toBe("Committed");
    expect(b._tag).toBe("Duplicate");
  });

  test("observations carry NO PII (no nick/avatar) — INV-8", async () => {
    const r = (await run(
      env("GUILD_MEMBER_ADD", {
        ...memberAdd,
        nick: "SECRET-NICK",
        avatar: "SECRET-AVATAR",
        communication_disabled_until: "2030-01-01",
      }),
    )) as Committed;
    const obs = (r.disposition as Projected).observations[0] as MembershipObserved;
    const json = JSON.stringify(obs);
    expect(json).not.toContain("SECRET-NICK");
    expect(json).not.toContain("SECRET-AVATAR");
    expect(json).not.toContain("communication_disabled_until");
  });
});
