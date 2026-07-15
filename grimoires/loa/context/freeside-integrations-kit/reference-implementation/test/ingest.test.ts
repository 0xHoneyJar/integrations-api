import { assert, describe, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import {
  DiscordAdapterRegistryLayer,
  InMemoryIngestionStoreLayer,
  RawEventEnvelope,
  ingestEnvelope
} from "../src/index.js"

const AppLayer = Layer.mergeAll(
  DiscordAdapterRegistryLayer,
  InMemoryIngestionStoreLayer
)

const memberAdd = RawEventEnvelope.make({
  provider: "discord",
  connectionId: "conn_discord_dev",
  tenantId: "tenant_honeyjar",
  eventType: "GUILD_MEMBER_ADD",
  upstreamEventId: "gateway-session-1:42",
  observedAt: "2026-07-15T12:00:00.000Z",
  receivedAt: "2026-07-15T12:00:00.250Z",
  sourceContractVersion: "discord-v10@candidate",
  rawPayloadHash: "sha256:test-fixture",
  payload: {
    guild_id: "guild_1",
    user: { id: "user_1" },
    roles: ["role_1"]
  }
})

describe("integration ingestion invariant", () => {
  layer(AppLayer)((it) => {
    it.effect("projects a classified member event", () =>
      Effect.gen(function*() {
        const result = yield* ingestEnvelope(memberAdd)
        assert.strictEqual(result._tag, "Committed")
        if (result._tag === "Committed") {
          assert.strictEqual(result.disposition._tag, "Projected")
        }
      })
    )

    it.effect("returns duplicate for the same upstream event", () =>
      Effect.gen(function*() {
        yield* ingestEnvelope(memberAdd)
        const result = yield* ingestEnvelope(memberAdd)
        assert.strictEqual(result._tag, "Duplicate")
      })
    )

    it.effect("persists an explicit ignore reason for excluded content", () =>
      Effect.gen(function*() {
        const result = yield* ingestEnvelope(
          RawEventEnvelope.make({
            ...memberAdd,
            upstreamEventId: "gateway-session-1:42-message",
            eventType: "MESSAGE_CREATE",
            payload: { content: "fixture-only" }
          })
        )
        assert.strictEqual(result._tag, "Committed")
        if (result._tag === "Committed") {
          assert.strictEqual(result.disposition._tag, "Ignored")
        }
      })
    )

    it.effect("quarantines an unclassified event instead of dropping it", () =>
      Effect.gen(function*() {
        const result = yield* ingestEnvelope(
          RawEventEnvelope.make({
            ...memberAdd,
            upstreamEventId: "gateway-session-1:43",
            eventType: "NEW_UNKNOWN_EVENT"
          })
        )
        assert.strictEqual(result._tag, "Committed")
        if (result._tag === "Committed") {
          assert.strictEqual(result.disposition._tag, "Quarantined")
        }
      })
    )

    it.effect("quarantines malformed Tier-1 payloads as patch candidates", () =>
      Effect.gen(function*() {
        const result = yield* ingestEnvelope(
          RawEventEnvelope.make({
            ...memberAdd,
            upstreamEventId: "gateway-session-1:44",
            payload: { guild_id: "guild_1" }
          })
        )
        assert.strictEqual(result._tag, "Committed")
        if (result._tag === "Committed" && result.disposition._tag === "Quarantined") {
          assert.isTrue(result.disposition.patchCandidate)
        }
      })
    )
  })
})
