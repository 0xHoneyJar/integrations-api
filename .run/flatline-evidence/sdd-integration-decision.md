# Flatline SDD review — integration decision (2026-07-15)
Route evidence: 3/3 headless voices (codex-headless, cursor/composer-2.5, grok).
Consensus APPROVED · chain_health ok · floor high · not degraded.
Scoring: HIGH=0 DISPUTED=14 BLOCKERS=14 (0% raw agreement — voices scrutinized different aspects).

## Disposition: all 11 refinements integrated as SDD §16 (authoritative, supersedes inline §4-§6 on conflict).
None challenge a ratified decision (R1-R5) or safety boundary → no operator halt.
16.1 tenantId in idempotency key (cross-tenant isolation)      [CRIT 880/955]
16.2 absent upstream-id → quarantine (missing-event-id), not content-fallback  [HIGH 785]
16.3 Conflict is a distinct IngestionResult terminal, never Committed          [CRIT 910/940]
16.4 first-disposition sticky; recovery/supersede = Tier-2 deferred            [CRIT 860]
16.5 result field = idempotencyKey (+ optional upstreamEventId)                [HIGH 720/760]
16.6 ingestUnknown(input) single public boundary owns decode-failure quarantine[HIGH 760/905]
16.7 rawPayloadHash optional + verified-or-quarantine (hash-mismatch)          [HIGH 740/915]
16.8 provider-dispatched registry; miss → unknown-provider before normalize    [HIGH 735/890]
16.9 canonicalization contract (JSON-only, sorted keys, reject non-serializable)[disp 915]
16.10 envelope constraints (NonEmptyString, sha256 pattern) + single Tier def   [HIGH 710]
16.11 telemetry ordering + fail-closed coverage generation                     [disp 695]
