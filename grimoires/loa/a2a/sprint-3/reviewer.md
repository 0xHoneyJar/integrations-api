# Sprint 3 Implementation Report — Discord reference adapter

## Executive Summary

Landed the Discord adapter and proved the full disposition matrix end-to-end through the
public `ingestUnknown` boundary. Facts are grounded in primary sources verified 2026-07-15.
All green.

## AC Verification

| Acceptance criterion (sprint.md S3) | Status | Evidence |
|---|---|---|
| S3-T1: ADD→Observed, UPDATE→Changed, REMOVE→Revoked; MESSAGE_CREATE→Ignored; unknown→Quarantined; SchemaError→AdapterContractError; DiscordAdapterRegistryLayer | ✓ Met | `src/providers/discord.ts:70-152` (switch), `:56-64` (decode→AdapterContractError), `:155` (layer) |
| S3-T2: end-to-end committed(ADD/UPDATE/REMOVE), ignored(MESSAGE_CREATE), quarantined(unknown + malformed), duplicate | ✓ Met | `tests/ingest.discord.test.ts` (8 tests, all via `ingestUnknown` + `DiscordAdapterRegistryLayer`) |
| S3-T2: malformed cannot disappear (AC-5) | ✓ Met | `tests/ingest.discord.test.ts:88-94` (missing `user` → Quarantined{malformed-payload}) |
| S3-T3: classification table + leave/kick/ban limitation + PII excluded + upstreamEventId=transport delivery id documented | ✓ Met | `src/providers/discord.ts:9-30` (table + limitations in header); `tests/ingest.discord.test.ts:113-127` (no nick/avatar/PII in observations) |
| Verification: full disposition matrix green; fixtures carry no secrets/PII (AC-7); typecheck/build green | ✓ Met | typecheck code 0; `bun test packages` → **371 pass / 0 fail**; fixtures use `tenant-test-0001`/`user-1` placeholders only |

## Tasks Completed

- `src/providers/discord.ts` — `discordAdapter` (AdapterFn): decode `MemberWithRoles`/`MemberRemoved` via Schema; ADD→`MembershipObserved`, UPDATE→`MembershipChanged`, REMOVE→`MembershipRevoked` (roles omitted); MESSAGE_CREATE→`Ignored`; unknown→`Quarantined{unclassified-event}`; decode failure→`AdapterContractError` (→ malformed-payload quarantine in ingest). `DiscordAdapterRegistryLayer` registers only `discord`.
- `src/index.ts` — exports `discordAdapter` + `DiscordAdapterRegistryLayer`.

## Technical Highlights

- **Primary-source grounded**: Gateway event names + payload shapes (guild_id, user.id, roles[]) verified against docs.discord.com; REST spec `specs/openapi.json`+`_preview.json` (v10). Encoded in Sprint 4 source manifests.
- **PII exclusion enforced at the seam**: `nick`/`avatar`/`communication_disabled_until` never enter observations — proven by a negative JSON-substring test.
- **Delivery-id semantics** (§17.1): `upstreamEventId` is transport-assigned (Discord Gateway has no durable per-event id); guaranteed present at the adapter because ingest quarantines missing-id first.

## Testing Summary

`tests/ingest.discord.test.ts` (8 tests): ADD/UPDATE/REMOVE observations, MESSAGE_CREATE ignored, unknown-event quarantine, malformed-payload quarantine, duplicate, no-PII. Run: `bun test packages/integrations-core` → 47 pass total.

## Known Limitations

- GUILD_MEMBER_REMOVE: leave vs kick vs ban not distinguishable (documented, in-code).
- Gateway transport/session semantics (resume/sequence/replay) are Tier-2 (Sprint 5 continuation).

## Verification Steps

```bash
cd packages/integrations-core && bun run typecheck
bun test packages && bun run build
```

Status: **COMPLETED**
