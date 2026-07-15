import { Effect, Layer, Schema } from "effect"
import {
  Ignored,
  MembershipObserved,
  Projected,
  Quarantined,
  type IngestionDisposition,
  type RawEventEnvelope
} from "../model.js"
import { AdapterContractError, AdapterRegistry } from "../services.js"

const DiscordGuildMemberAdd = Schema.Struct({
  guild_id: Schema.String,
  user: Schema.Struct({ id: Schema.String }),
  roles: Schema.Array(Schema.String)
})

const normalizeDiscordMemberAdd = Effect.fn("Discord.normalizeGuildMemberAdd")(
  function*(envelope: RawEventEnvelope) {
    const payload = yield* Schema.decodeUnknownEffect(DiscordGuildMemberAdd)(
      envelope.payload
    ).pipe(
      Effect.catchTag("SchemaError", (error) =>
        Effect.fail(
          AdapterContractError.make({
            provider: envelope.provider,
            eventType: envelope.eventType,
            reason: error.message
          })
        )
      )
    )

    return Projected.make({
      observations: [
        MembershipObserved.make({
          provider: "discord",
          connectionId: envelope.connectionId,
          tenantId: envelope.tenantId,
          upstreamEventId: envelope.upstreamEventId,
          observedAt: envelope.observedAt,
          externalAccountId: `discord:${payload.user.id}`,
          communityExternalId: `discord:guild:${payload.guild_id}`,
          roleExternalIds: payload.roles.map((roleId) => `discord:role:${roleId}`)
        })
      ]
    })
  }
)

const normalize = Effect.fn("AdapterRegistry.normalize")(
  function*(envelope: RawEventEnvelope) {
    if (envelope.provider !== "discord") {
      return Quarantined.make({
        reason: `${envelope.provider} is intentionally not implemented in this reference`,
        patchCandidate: false
      })
    }

    if (envelope.eventType === "GUILD_MEMBER_ADD") {
      return yield* normalizeDiscordMemberAdd(envelope)
    }

    if (envelope.eventType === "MESSAGE_CREATE") {
      return Ignored.make({
        reason: "message content is excluded from the Tier-1 member graph",
        classification: "tier-3"
      })
    }

    return Quarantined.make({
      reason: `unclassified Discord event: ${envelope.eventType}`,
      patchCandidate: true
    })
  }
)

export const DiscordAdapterRegistryLayer = Layer.succeed(AdapterRegistry, {
  normalize
})
