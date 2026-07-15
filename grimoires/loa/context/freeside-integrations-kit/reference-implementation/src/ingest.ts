import { Effect } from "effect"
import {
  Committed,
  Duplicate,
  Quarantined,
  type IngestionResult,
  type RawEventEnvelope
} from "./model.js"
import { AdapterRegistry, IngestionStore } from "./services.js"

export const ingestEnvelope = Effect.fn("Integrations.ingestEnvelope")(
  function*(envelope: RawEventEnvelope) {
    const adapters = yield* AdapterRegistry
    const store = yield* IngestionStore

    yield* Effect.annotateCurrentSpan({
      provider: envelope.provider,
      connectionId: envelope.connectionId,
      eventType: envelope.eventType,
      upstreamEventId: envelope.upstreamEventId
    })

    const disposition = yield* adapters.normalize(envelope).pipe(
      Effect.catchTag("AdapterContractError", (error) =>
        Effect.succeed(
          Quarantined.make({
            reason: `adapter contract mismatch: ${error.reason}`,
            patchCandidate: true
          })
        )
      )
    )

    const status = yield* store.commit(envelope, disposition)

    if (status === "duplicate") {
      return Duplicate.make({ upstreamEventId: envelope.upstreamEventId })
    }

    return Committed.make({
      upstreamEventId: envelope.upstreamEventId,
      disposition
    })
  }
)
