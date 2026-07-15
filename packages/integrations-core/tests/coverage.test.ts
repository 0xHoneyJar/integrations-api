import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { CoverageManifest } from "../src/protocol/coverage.js";
import { EvidenceReceipt, SourceManifest } from "../src/protocol/source.js";
import { DISCORD_CLASSIFICATION, discordAdapter } from "../src/providers/discord.js";
import {
  assertTestsPassed,
  CoverageBuildError,
  discordCoverageManifest,
} from "../src/coverage-build.js";
import { Ignored, Projected } from "../src/protocol/disposition.js";

const pkg = join(import.meta.dir, "..");
const read = (rel: string) => JSON.parse(readFileSync(join(pkg, rel), "utf8"));

describe("governance artifacts exist at canonical paths + validate (AC-9, §11.6/§16.11)", () => {
  test("coverage report decodes against CoverageManifest (semantic validation)", () => {
    const c = Schema.decodeUnknownSync(CoverageManifest)(read("coverage/discord.coverage.json"));
    expect(c.provider).toBe("discord");
    expect(c.dimensions.length).toBe(7);
  });

  test("every admitted event is classified Tier-1/2/3 with a disposition", () => {
    const c = Schema.decodeUnknownSync(CoverageManifest)(read("coverage/discord.coverage.json"));
    for (const entry of DISCORD_CLASSIFICATION) {
      const found = c.surface.find((s) => s.event === entry.event);
      expect(found?.tier).toBe(entry.tier);
    }
  });

  test("evidence receipt decodes + labels the spine NON-PRODUCTION with limitations (§17.6)", () => {
    const e = Schema.decodeUnknownSync(EvidenceReceipt)(read("evidence/discord.evidence.json"));
    expect(e.productionReadiness).toBe("non-production");
    expect(e.approvalState).toBe("unpublished");
    expect(e.liveResults).toBe("tier-2-deferred");
    expect(e.knownLimitations.length).toBeGreaterThan(0);
  });

  test("REST + Gateway source manifests decode against SourceManifest (FR-6/FR-11)", () => {
    const rest = Schema.decodeUnknownSync(SourceManifest)(read("source/discord.rest.source.json"));
    const gw = Schema.decodeUnknownSync(SourceManifest)(read("source/discord.gateway.source.json"));
    expect(rest.sourceClass).toBe("openapi");
    expect(gw.sourceClass).toBe("event-catalog");
  });
});

describe("fail-closed generation (§16.11)", () => {
  test("assertTestsPassed(false) throws CoverageBuildError", () => {
    expect(() => assertTestsPassed(false)).toThrow(CoverageBuildError);
  });
  test("assertTestsPassed(true) does not throw", () => {
    expect(() => assertTestsPassed(true)).not.toThrow();
  });
  test("builder validates its own output (fail-closed on schema drift)", () => {
    expect(() => discordCoverageManifest("2026-07-15T00:00:00Z")).not.toThrow();
  });
});

describe("classification table ⇔ adapter agreement (no coverage drift)", () => {
  const run = <A, E>(e: Effect.Effect<A, E>) => Effect.runPromise(e);
  const env = (eventType: string, payload: unknown) => ({
    provider: "discord" as const,
    connectionId: "c",
    tenantId: "t",
    eventType,
    upstreamEventId: "u",
    observedAt: "o",
    receivedAt: "r",
    sourceContractVersion: "v",
    payload,
  });
  const validPayload = { guild_id: "g", user: { id: "u" }, roles: [] };

  test("each table entry's disposition matches what the adapter actually returns", async () => {
    for (const entry of DISCORD_CLASSIFICATION) {
      const payload = entry.event === "MESSAGE_CREATE" ? { content: "x" } : validPayload;
      const d = await run(discordAdapter(env(entry.event, payload)));
      if (entry.disposition === "Projected") expect(d).toBeInstanceOf(Projected);
      if (entry.disposition === "Ignored") expect(d).toBeInstanceOf(Ignored);
    }
  });
});
