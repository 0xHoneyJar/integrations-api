/**
 * NON-PRODUCTION guard (§17.6, flatline code-review CRITICAL 860): the in-memory
 * store must fail fast in production so a consumer can't silently wire it into a
 * live path.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { IngestionStore, InMemoryIngestionStoreLayer } from "../src/index.js";

const useStore = Effect.gen(function* () {
  const store = yield* IngestionStore;
  return yield* store.getRecord("k");
}).pipe(Effect.provide(InMemoryIngestionStoreLayer));

const savedNodeEnv = process.env.NODE_ENV;
const savedAllow = process.env.INTEGRATIONS_ALLOW_INMEMORY;

afterEach(() => {
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
  if (savedAllow === undefined) delete process.env.INTEGRATIONS_ALLOW_INMEMORY;
  else process.env.INTEGRATIONS_ALLOW_INMEMORY = savedAllow;
});

describe("InMemoryIngestionStoreLayer production guard", () => {
  test("dies when NODE_ENV=production (no override)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATIONS_ALLOW_INMEMORY;
    const exit = await Effect.runPromiseExit(useStore);
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("permitted in production with INTEGRATIONS_ALLOW_INMEMORY=1 override", async () => {
    process.env.NODE_ENV = "production";
    process.env.INTEGRATIONS_ALLOW_INMEMORY = "1";
    const exit = await Effect.runPromiseExit(useStore);
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  test("permitted outside production (default test env)", async () => {
    process.env.NODE_ENV = "test";
    const exit = await Effect.runPromiseExit(useStore);
    expect(Exit.isSuccess(exit)).toBe(true);
  });
});
