@.claude/loa/CLAUDE.loa.md

# integrations-api — project instructions

The Loa framework above supplies workflow gates. These project instructions define the building boundary and take precedence for repository-specific work.

## Building identity

This repository is evolving from `freeside-mediums` into the Freeside `integrations-api` building. It owns evidence-backed normalization of external provider events into privacy-bounded Freeside observations.

Wave 1 is a **non-production, library-level reference**. It proves the ingestion contract with an in-memory store and a Discord membership vertical. It does not claim deployed transport or durable persistence.

The previous presentation domain remains supported as separate compatibility packages:

- `@0xhoneyjar/medium-registry`
- `@0xhoneyjar/cli-renderer`
- `@0xhoneyjar/discord-renderer`

Do not merge presentation-capability or rendering semantics into the ingestion protocol.

## Canonical project surfaces

| Surface | Responsibility |
|---|---|
| `packages/integrations-core/` | Event envelope, provider adapters, identity, dispositions, store port, coverage, evidence |
| `packages/protocol/` | Preserved `medium-registry` package plus the building BeaconV3 source |
| `.well-known/beacon.json` | Machine-readable projection of `packages/protocol/beacon.yaml` |
| `grimoires/loa/prd.md` | Ratified wave-1 product requirements |
| `grimoires/loa/sdd.md` | Ratified architecture and invariant center |
| `grimoires/loa/sprint.md` | Five-sprint implementation plan |
| `grimoires/loa/context/freeside-integrations-kit/` | Imported source kit; reference material, not executable truth |
| `grimoires/loa/decisions/ADR-durable-ingestion-store.md` | Production persistence gate |

## Load-bearing invariants

- `ingestUnknown` is the sole public ingestion boundary.
- Every decoded event is projected, ignored, quarantined, duplicate, conflict, or a surfaced failure. No silent drops.
- Idempotency identity includes tenant, provider, connection, and transport-assigned event ID.
- First write is sticky; a new digest for an existing identity is a conflict, never an overwrite.
- Quarantine stores a digest and reason, never the raw provider payload.
- Provider adapters are selected by provider identity and cannot silently fall through.
- Telemetry may contain only explicitly allowlisted metadata; never payloads, secrets, nicknames, message content, or avatars.
- The in-memory store must fail fast in production unless an explicit sandbox override is present.

## Federation boundary

The BeaconV3 slug is `integrations-api`. Keep `composes_with` empty until a real sibling port exists with a verified `TagName@semver+hash` reference. Consumers and aspirational seams are documentation, not composition claims.

This repository does not unilaterally mutate `loa-freeside` registry state, sibling repositories, GitHub repository names, deployments, or DNS. Those require their own governed cross-repository ratification.

## Compatibility boundary

- Keep `@0xhoneyjar/medium-registry` at `0.2.0` during this wave.
- Existing descriptor singleton and `MediumCapability` imports must remain source-compatible.
- Breaking presentation changes require a major version and coordinated downstream work.
- Effect remains a peer dependency across public schema packages.

## Production NOs

- Do not label the ingestion spine durable or production-ready while it uses `Ref` memory.
- Do not add provider tokens, webhook secrets, Discord user payloads, or live tenant data.
- Do not add a transport without delivery identity, authentication/signature validation, replay, and reconciliation decisions.
- Do not publish `@0xhoneyjar/integrations-core` until the durable-store and evidence gates are satisfied.
- Do not add placeholder Beacon hashes or fabricated sibling Tag references.

## Verification

Run the complete gate before committing implementation changes:

```bash
bun test
bun run typecheck
bun run build
bun run acvp:verify
```

Coverage generation requires an explicit post-test attestation:

```bash
bun run --cwd packages/integrations-core coverage:build --tests-passed
```

Use `br` for tracked work and preserve Loa review/audit artifacts under `grimoires/loa/a2a/`.
