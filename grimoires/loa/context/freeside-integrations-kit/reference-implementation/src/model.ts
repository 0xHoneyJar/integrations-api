import { Schema } from "effect"

export const Provider = Schema.Literals(["discord", "telegram", "luma"])
export type Provider = typeof Provider.Type

export class RawEventEnvelope extends Schema.Class<RawEventEnvelope>("RawEventEnvelope")({
  provider: Provider,
  connectionId: Schema.String,
  tenantId: Schema.String,
  eventType: Schema.String,
  upstreamEventId: Schema.String,
  observedAt: Schema.String,
  receivedAt: Schema.String,
  sourceContractVersion: Schema.String,
  rawPayloadHash: Schema.String,
  payload: Schema.Unknown
}) {}

export class MembershipObserved extends Schema.TaggedClass<MembershipObserved>()(
  "MembershipObserved",
  {
    provider: Provider,
    connectionId: Schema.String,
    tenantId: Schema.String,
    upstreamEventId: Schema.String,
    observedAt: Schema.String,
    externalAccountId: Schema.String,
    communityExternalId: Schema.String,
    roleExternalIds: Schema.Array(Schema.String)
  }
) {}

export const Observation = Schema.Union([MembershipObserved])
export type Observation = typeof Observation.Type

export class Projected extends Schema.TaggedClass<Projected>()("Projected", {
  observations: Schema.Array(Observation)
}) {}

export class Ignored extends Schema.TaggedClass<Ignored>()("Ignored", {
  reason: Schema.String,
  classification: Schema.Literals(["tier-2", "tier-3"])
}) {}

export class Quarantined extends Schema.TaggedClass<Quarantined>()("Quarantined", {
  reason: Schema.String,
  patchCandidate: Schema.Boolean
}) {}

export const IngestionDisposition = Schema.Union([Projected, Ignored, Quarantined])
export type IngestionDisposition = typeof IngestionDisposition.Type

export class Committed extends Schema.TaggedClass<Committed>()("Committed", {
  upstreamEventId: Schema.String,
  disposition: IngestionDisposition
}) {}

export class Duplicate extends Schema.TaggedClass<Duplicate>()("Duplicate", {
  upstreamEventId: Schema.String
}) {}

export const IngestionResult = Schema.Union([Committed, Duplicate])
export type IngestionResult = typeof IngestionResult.Type

