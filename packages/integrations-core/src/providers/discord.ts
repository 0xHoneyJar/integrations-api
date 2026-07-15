/**
 * Discord adapter — the wave-1 reference vertical (SDD §7 / §11.4).
 *
 * Facts verified 2026-07-15 against primary sources:
 *   - docs.discord.com/developers/topics/gateway-events
 *   - github.com/discord/discord-api-spec (specs/openapi.json + _preview.json)
 *
 * Bounded classification table (the wave-1 admitted surface ONLY — not the whole
 * Gateway):
 *   GUILD_MEMBER_ADD    → Projected[MembershipObserved]   (Tier-1)
 *   GUILD_MEMBER_UPDATE → Projected[MembershipChanged]    (Tier-1)
 *   GUILD_MEMBER_REMOVE → Projected[MembershipRevoked]    (Tier-1)
 *   MESSAGE_CREATE      → Ignored{message-content-excluded} (Tier-3)
 *   any other event     → Quarantined{unclassified-event}
 *   undecodable payload → AdapterContractError → malformed-payload (in ingest)
 *
 * LIMITATION: GUILD_MEMBER_REMOVE cannot distinguish leave vs kick vs ban.
 * PII (nick, avatar, flags, communication_disabled_until) is EXCLUDED (INV-8).
 * `upstreamEventId` is the TRANSPORT-assigned delivery id (§17.1) — it is
 * guaranteed present here because ingest quarantines missing-event-id BEFORE
 * calling normalize (§16.2).
 */
import { Effect, Schema } from "effect";
import type { RawEventEnvelope } from "../protocol/envelope.js";
import {
  Ignored,
  Projected,
  Quarantined,
  type IngestionDisposition,
} from "../protocol/disposition.js";
import {
  MembershipChanged,
  MembershipObserved,
  MembershipRevoked,
} from "../protocol/observation.js";
import { AdapterContractError } from "../errors.js";
import { canonicalDigest } from "../identity.js";
import { AdapterRegistryLayer, type AdapterFn } from "../services.js";

const DiscordUser = Schema.Struct({ id: Schema.NonEmptyString });
const MemberWithRoles = Schema.Struct({
  guild_id: Schema.NonEmptyString,
  user: DiscordUser,
  roles: Schema.Array(Schema.String),
});
const MemberRemoved = Schema.Struct({
  guild_id: Schema.NonEmptyString,
  user: DiscordUser,
});

const decode = <A, I>(schema: Schema.Schema<A, I>, envelope: RawEventEnvelope) =>
  Schema.decodeUnknown(schema)(envelope.payload).pipe(
    Effect.mapError(
      (e) =>
        new AdapterContractError({
          provider: "discord",
          eventType: envelope.eventType,
          reason: String(e),
        }),
    ),
  );

// upstreamEventId guaranteed present — ingest gates missing-id before normalize.
const meta = (e: RawEventEnvelope) => ({
  provider: "discord" as const,
  connectionId: e.connectionId,
  tenantId: e.tenantId,
  upstreamEventId: e.upstreamEventId!,
  observedAt: e.observedAt,
});

const account = (userId: string) => `discord:${userId}`;
const community = (guildId: string) => `discord:guild:${guildId}`;
const roleId = (r: string) => `discord:role:${r}`;

export const discordAdapter: AdapterFn = (
  envelope,
): Effect.Effect<IngestionDisposition, AdapterContractError> => {
  switch (envelope.eventType) {
    case "GUILD_MEMBER_ADD":
      return decode(MemberWithRoles, envelope).pipe(
        Effect.map(
          (p) =>
            new Projected({
              observations: [
                new MembershipObserved({
                  ...meta(envelope),
                  externalAccountId: account(p.user.id),
                  communityExternalId: community(p.guild_id),
                  roleExternalIds: p.roles.map(roleId),
                }),
              ],
            }),
        ),
      );

    case "GUILD_MEMBER_UPDATE":
      return decode(MemberWithRoles, envelope).pipe(
        Effect.map(
          (p) =>
            new Projected({
              observations: [
                new MembershipChanged({
                  ...meta(envelope),
                  externalAccountId: account(p.user.id),
                  communityExternalId: community(p.guild_id),
                  roleExternalIds: p.roles.map(roleId),
                }),
              ],
            }),
        ),
      );

    case "GUILD_MEMBER_REMOVE":
      return decode(MemberRemoved, envelope).pipe(
        Effect.map(
          (p) =>
            new Projected({
              observations: [
                new MembershipRevoked({
                  ...meta(envelope),
                  externalAccountId: account(p.user.id),
                  communityExternalId: community(p.guild_id),
                }),
              ],
            }),
        ),
      );

    case "MESSAGE_CREATE":
      // Message content is excluded from the Tier-1 member graph (INV-8).
      return Effect.succeed(
        new Ignored({ reason: "message-content-excluded", classification: "tier-3" }),
      );

    default:
      return Effect.succeed(
        new Quarantined({
          reason: "unclassified-event",
          patchCandidate: true,
          payloadDigest: canonicalDigest(envelope.payload),
          eventType: envelope.eventType,
        }),
      );
  }
};

/** Provider-keyed registry layer registering ONLY the discord adapter (§16.8). */
export const DiscordAdapterRegistryLayer = AdapterRegistryLayer({ discord: discordAdapter });

/**
 * The single classification table (§16.11) — coverage is DERIVED from this, and
 * a test asserts the adapter switch above agrees with it (no drift). Bounded to
 * the wave-1 admitted surface; every other event → Quarantined{unclassified-event}.
 */
export const DISCORD_CLASSIFICATION: ReadonlyArray<{
  readonly event: string;
  readonly tier: "tier-1" | "tier-2" | "tier-3";
  readonly disposition: "Projected" | "Ignored";
  readonly reasonCode?: "message-content-excluded";
}> = [
  { event: "GUILD_MEMBER_ADD", tier: "tier-1", disposition: "Projected" },
  { event: "GUILD_MEMBER_UPDATE", tier: "tier-1", disposition: "Projected" },
  { event: "GUILD_MEMBER_REMOVE", tier: "tier-1", disposition: "Projected" },
  {
    event: "MESSAGE_CREATE",
    tier: "tier-3",
    disposition: "Ignored",
    reasonCode: "message-content-excluded",
  },
];
