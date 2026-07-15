import { Context, Effect, Layer, Ref, Schema } from "effect"
import type { IngestionDisposition, RawEventEnvelope } from "./model.js"

export class AdapterContractError extends Schema.TaggedErrorClass<AdapterContractError>()(
  "AdapterContractError",
  {
    provider: Schema.String,
    eventType: Schema.String,
    reason: Schema.String
  }
) {}

export class IngestionStoreError extends Schema.TaggedErrorClass<IngestionStoreError>()(
  "IngestionStoreError",
  {
    operation: Schema.String,
    cause: Schema.Defect()
  }
) {}

export class AdapterRegistry extends Context.Service<AdapterRegistry, {
  readonly normalize: (
    envelope: RawEventEnvelope
  ) => Effect.Effect<IngestionDisposition, AdapterContractError>
}>()("@freeside-integrations/AdapterRegistry") {}

export type CommitStatus = "committed" | "duplicate"

export class IngestionStore extends Context.Service<IngestionStore, {
  readonly commit: (
    envelope: RawEventEnvelope,
    disposition: IngestionDisposition
  ) => Effect.Effect<CommitStatus, IngestionStoreError>
}>()("@freeside-integrations/IngestionStore") {}

const eventKey = (envelope: RawEventEnvelope): string =>
  `${envelope.provider}:${envelope.connectionId}:${envelope.upstreamEventId}`

interface StoredRecord {
  readonly envelope: RawEventEnvelope
  readonly disposition: IngestionDisposition
}

interface InMemoryState {
  readonly keys: ReadonlySet<string>
  readonly records: ReadonlyArray<StoredRecord>
}

/**
 * Demonstrates the atomic service boundary. Production should implement the
 * same method with one database transaction containing the idempotency key and
 * full disposition record.
 */
export const InMemoryIngestionStoreLayer = Layer.effect(IngestionStore)(
  Effect.gen(function*() {
    const state = yield* Ref.make<InMemoryState>({
      keys: new Set<string>(),
      records: []
    })

    return {
      commit: Effect.fn("IngestionStore.commit")(function*(envelope, disposition) {
        const key = eventKey(envelope)
        return yield* Ref.modify(state, (current): [CommitStatus, InMemoryState] => {
          if (current.keys.has(key)) {
            return ["duplicate", current]
          }
          const keys = new Set(current.keys)
          keys.add(key)
          return [
            "committed",
            {
              keys,
              records: [...current.records, { envelope, disposition }]
            }
          ]
        })
      })
    }
  })
)
