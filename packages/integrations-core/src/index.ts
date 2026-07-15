/**
 * `@0xhoneyjar/integrations-core` — Freeside integrations building core.
 *
 * Wave-1 NON-PRODUCTION reference vertical (in-memory, deterministic, no
 * secrets/network). Every received event has a durable, explainable disposition
 * (INV-1); zero silent drops.
 *
 * Public surface (grows per sprint):
 *   - protocol schemas (provider, envelope, observation, disposition, result,
 *     coverage, source)
 *   - identity helpers (canonicalDigest, idempotencyKey, safeDigest, quarantineKey)
 *   - typed errors (AdapterContractError, IngestionStoreError)
 *
 * NOTE (§17.4): the ingestion boundary exported in later sprints is
 * `ingestUnknown` ONLY. `ingestEnvelope` is internal and never exported.
 */
export * from "./protocol/index.js";
export * from "./errors.js";
export {
  canonicalDigest,
  idempotencyKey,
  stableStringify,
  safeDigest,
  quarantineKey,
} from "./identity.js";
