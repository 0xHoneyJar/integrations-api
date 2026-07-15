/**
 * `@0xhoneyjar/integrations-core` — Freeside integrations building core.
 *
 * Wave-1 NON-PRODUCTION reference vertical (in-memory, deterministic, no
 * secrets/network). Every decoded event has an explainable disposition (INV-1);
 * zero silent drops. Production durability remains a separate store gate.
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

// Ingestion boundary — `ingestUnknown` ONLY (§17.4). `ingestEnvelope` is
// internal and intentionally NOT re-exported here.
export { ingestUnknown } from "./ingest.js";
export {
  AdapterRegistry,
  AdapterRegistryLayer,
  IngestionStore,
  InMemoryIngestionStoreLayer,
  makeAdapterRegistry,
} from "./services.js";
export type {
  AdapterFn,
  AdapterRegistryShape,
  CommitOutcome,
  IngestionStoreShape,
  QuarantineOutcome,
} from "./services.js";
export { annotateDisposition, annotateIdentity } from "./telemetry.js";

// Discord reference vertical (§7 / §11.4)
export { discordAdapter, DiscordAdapterRegistryLayer } from "./providers/discord.js";
