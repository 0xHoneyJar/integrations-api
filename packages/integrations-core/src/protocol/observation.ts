/**
 * Observations — Tier-1 normalized domain facts (SDD §11.4 / §16.4).
 *
 * Each carries a minimal universal metadata envelope (provider, connectionId,
 * tenantId, upstreamEventId, observedAt) plus provider-neutral membership edges.
 * PII (nick, avatar, flags, communication_disabled_until) is EXCLUDED by
 * default (INV-8). Provider facts are not identity conclusions (INV-7).
 */
import { Schema } from "effect";
import { Provider } from "./provider.js";

const ObservationMetaFields = {
  provider: Provider,
  connectionId: Schema.NonEmptyString,
  tenantId: Schema.NonEmptyString,
  upstreamEventId: Schema.NonEmptyString,
  observedAt: Schema.NonEmptyString,
};

/** GUILD_MEMBER_ADD → a member is observed in a community with a role set. */
export class MembershipObserved extends Schema.TaggedClass<MembershipObserved>()(
  "MembershipObserved",
  {
    ...ObservationMetaFields,
    externalAccountId: Schema.NonEmptyString,
    communityExternalId: Schema.NonEmptyString,
    roleExternalIds: Schema.Array(Schema.String),
  },
) {}

/** GUILD_MEMBER_UPDATE → the member's current role set changed. */
export class MembershipChanged extends Schema.TaggedClass<MembershipChanged>()(
  "MembershipChanged",
  {
    ...ObservationMetaFields,
    externalAccountId: Schema.NonEmptyString,
    communityExternalId: Schema.NonEmptyString,
    roleExternalIds: Schema.Array(Schema.String),
  },
) {}

/**
 * GUILD_MEMBER_REMOVE → the member left the community.
 * LIMITATION: leave vs kick vs ban is NOT distinguishable from the Gateway
 * REMOVE event (SDD §16.4). No role set on removal.
 */
export class MembershipRevoked extends Schema.TaggedClass<MembershipRevoked>()(
  "MembershipRevoked",
  {
    ...ObservationMetaFields,
    externalAccountId: Schema.NonEmptyString,
    communityExternalId: Schema.NonEmptyString,
  },
) {}

export const Observation = Schema.Union(
  MembershipObserved,
  MembershipChanged,
  MembershipRevoked,
);
export type Observation = typeof Observation.Type;
