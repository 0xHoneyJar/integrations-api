# Flatline SPRINT review — integration decision (2026-07-15)
3/3 voices, APPROVED, chain_health ok, floor high. HIGH=0 DISPUTED=14 BLOCKERS=14 (0% agree).
All integrated as SDD §17 + sprint edits. None challenge R1-R5 or safety.
17.1 upstreamEventId = TRANSPORT-assigned delivery id (Discord Gateway has no durable per-event id — verified). Durable Discord identity (session/seq + reconnect/replay) = Tier-2 continuation.  [CRIT 940]
17.2 Quarantine-record identity is SEPARATE from event idempotency key (handles null-key/malformed). [CRIT 885]
17.3 Trust boundary MUST invariant: tenantId/connectionId/provider are trusted transport metadata (authenticated above wave-1); payload is untrusted. Envelope values cannot override authenticated context in real runtime. [CRIT 840, HIGH 755]
17.4 ingestUnknown = SOLE public export; ingestEnvelope internal. [CRIT 880]
17.5 Effect peerDep tightened to >=3.21.2 <4 on integrations-core (subset of A5 ^3.10.0; medium-registry untouched). [HIGH 720/770]
17.6 Sticky-conflict spine labeled NON-PRODUCTION (hard DoD); durable-store + conflict-recovery = named ADR + skipped contract-test stub; recovery PR required before any durable store. [CRIT 820/860]
17.7 Security continuation checklist: Ed25519 signed-interaction verification, clock skew, replay window — named non-goal + continuation blocking item. [HIGH 740]
17.8 Canonicalization fully specified (UTF-8, sorted keys, arrays preserved, reject non-serializable, length-capped safe digest for malformed). [HIGH 710/760]
