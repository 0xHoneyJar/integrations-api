import { describe, expect, test } from "bun:test";
import { Cause, Effect, Exit, Layer } from "effect";
import * as pkg from "../src/index.js";
import {
  AdapterRegistryLayer,
  type AdapterFn,
  IngestionStore,
  InMemoryIngestionStoreLayer,
  ingestUnknown,
} from "../src/index.js";
import { Ignored, Projected } from "../src/protocol/disposition.js";
import { AdapterContractError, IngestionStoreError } from "../src/errors.js";

// --- stub adapters (the real Discord adapter lands in Sprint 3) -------------
const stubProject: AdapterFn = () => Effect.succeed(new Projected({ observations: [] }));
const stubIgnore: AdapterFn = () =>
  Effect.succeed(new Ignored({ reason: "message-content-excluded", classification: "tier-3" }));
const stubFail: AdapterFn = (e) =>
  Effect.fail(
    new AdapterContractError({ provider: e.provider, eventType: e.eventType, reason: "stub" }),
  );
const stubDie: AdapterFn = () => Effect.die(new Error("boom-defect"));

type Adapters = Parameters<typeof AdapterRegistryLayer>[0];
const layers = (adapters: Adapters, store: Layer.Layer<IngestionStore> = InMemoryIngestionStoreLayer) =>
  Layer.merge(store, AdapterRegistryLayer(adapters));

const run = (input: unknown, adapters: Adapters = { discord: stubProject }) =>
  Effect.runPromise(ingestUnknown(input).pipe(Effect.provide(layers(adapters))));

const runSeq = (inputs: unknown[], adapters: Adapters = { discord: stubProject }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const out = [];
      for (const i of inputs) out.push(yield* ingestUnknown(i));
      return out;
    }).pipe(Effect.provide(layers(adapters))),
  );

const env = (over: Record<string, unknown> = {}) => ({
  provider: "discord",
  connectionId: "c",
  tenantId: "t",
  eventType: "GUILD_MEMBER_ADD",
  upstreamEventId: "e1",
  observedAt: "o",
  receivedAt: "r",
  sourceContractVersion: "v",
  payload: { ok: true },
  ...over,
});

describe("§17.4 single public boundary", () => {
  test("package exports ingestUnknown but NOT ingestEnvelope", () => {
    expect(typeof pkg.ingestUnknown).toBe("function");
    expect("ingestEnvelope" in pkg).toBe(false);
  });
});

describe("disposition matrix (§16.1/§16.3)", () => {
  test("committed → Committed{Projected}", async () => {
    const r = await run(env());
    expect(r._tag).toBe("Committed");
    expect((r as pkg.Committed).disposition._tag).toBe("Projected");
  });

  test("re-delivery → Duplicate (idempotent)", async () => {
    const [a, b] = await runSeq([env(), env()]);
    expect(a._tag).toBe("Committed");
    expect(b._tag).toBe("Duplicate");
  });

  test("same key + different payload → Conflict, not Committed (§16.3)", async () => {
    const [a, b] = await runSeq([
      env({ payload: { ok: true } }),
      env({ payload: { ok: false } }), // same upstreamEventId → same key, different digest
    ]);
    expect(a._tag).toBe("Committed");
    expect(b._tag).toBe("Conflict");
  });

  test("adapter contract failure → Quarantined{malformed-payload}", async () => {
    const r = await run(env(), { discord: stubFail });
    expect(r._tag).toBe("Committed");
    const d = (r as pkg.Committed).disposition as pkg.Quarantined;
    expect(d._tag).toBe("Quarantined");
    expect(d.reason).toBe("malformed-payload");
    expect(d.patchCandidate).toBe(true);
  });

  test("ignored disposition passes through", async () => {
    const r = await run(env(), { discord: stubIgnore });
    expect((r as pkg.Committed).disposition._tag).toBe("Ignored");
  });
});

describe("quarantine paths — no silent drops (§16.2/§16.7/§16.8, INV-1)", () => {
  test("absent upstreamEventId → Quarantined{missing-event-id}", async () => {
    const { upstreamEventId, ...noId } = env();
    const r = await run(noId);
    const d = (r as pkg.Committed).disposition as pkg.Quarantined;
    expect(d.reason).toBe("missing-event-id");
  });

  test("rawPayloadHash mismatch → Quarantined{hash-mismatch}", async () => {
    const r = await run(env({ rawPayloadHash: "a".repeat(64) }));
    const d = (r as pkg.Committed).disposition as pkg.Quarantined;
    expect(d.reason).toBe("hash-mismatch");
  });

  test("unregistered provider → Quarantined{unknown-provider} before normalize", async () => {
    const r = await run(env({ provider: "telegram" }), { discord: stubProject });
    const d = (r as pkg.Committed).disposition as pkg.Quarantined;
    expect(d.reason).toBe("unknown-provider");
  });

  test("undecodable envelope → durable Quarantined{malformed-envelope}", async () => {
    const r = await run({ not: "an envelope" });
    const d = (r as pkg.Committed).disposition as pkg.Quarantined;
    expect(d._tag).toBe("Quarantined");
    expect(d.reason).toBe("malformed-envelope");
    expect((r as pkg.Committed).idempotencyKey.startsWith("quarantine:")).toBe(true);
  });
});

describe("failure taxonomy — defects/store-errors surface (§16.3)", () => {
  test("store commit failure surfaces IngestionStoreError (retryable, not swallowed)", async () => {
    const failingStore = Layer.succeed(IngestionStore, {
      commit: () =>
        Effect.fail(new IngestionStoreError({ operation: "commit", cause: "disk full" })),
      quarantine: () =>
        Effect.fail(new IngestionStoreError({ operation: "quarantine", cause: "disk full" })),
      getRecord: () => Effect.succeed(undefined),
    });
    const res = await Effect.runPromise(
      ingestUnknown(env()).pipe(
        Effect.either,
        Effect.provide(Layer.merge(failingStore, AdapterRegistryLayer({ discord: stubProject }))),
      ),
    );
    expect(res._tag).toBe("Left");
    expect((res as { left: IngestionStoreError }).left._tag).toBe("IngestionStoreError");
  });

  test("unexpected defect propagates (never laundered into a quarantine)", async () => {
    const exit = await Effect.runPromiseExit(
      ingestUnknown(env()).pipe(Effect.provide(layers({ discord: stubDie }))),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) expect(Cause.isDie(exit.cause)).toBe(true);
  });
});

describe("atomicity (§16.4, AC-6)", () => {
  test("N concurrent commits of one key → exactly 1 Committed + (N-1) Duplicate", async () => {
    const N = 16;
    const results = await Effect.runPromise(
      Effect.all(
        Array.from({ length: N }, () => ingestUnknown(env())),
        { concurrency: "unbounded" },
      ).pipe(Effect.provide(layers({ discord: stubProject }))),
    );
    const committed = results.filter((r) => r._tag === "Committed").length;
    const duplicate = results.filter((r) => r._tag === "Duplicate").length;
    expect(committed).toBe(1);
    expect(duplicate).toBe(N - 1);
  });

  test("persisted state is inspectable after commit (IMP-008)", async () => {
    const record = await Effect.runPromise(
      Effect.gen(function* () {
        yield* ingestUnknown(env());
        const store = yield* IngestionStore;
        return yield* store.getRecord("t:discord:c:e1");
      }).pipe(Effect.provide(layers({ discord: stubProject }))),
    );
    expect(record).toBeDefined();
    expect(record?.disposition._tag).toBe("Projected");
  });
});
