/**
 * Typed error channels (SDD §6.1 / §16.3).
 *
 * `AdapterContractError` is the ONLY error that converts to a Quarantined
 * disposition (provider decode/contract mismatch). `IngestionStoreError`
 * surfaces loudly (retryable) and is NEVER laundered into a quarantine —
 * infrastructure failures must not masquerade as provider "drift".
 */
import { Schema } from "effect";

export class AdapterContractError extends Schema.TaggedError<AdapterContractError>()(
  "AdapterContractError",
  {
    provider: Schema.String,
    eventType: Schema.String,
    reason: Schema.String,
  },
) {}

export class IngestionStoreError extends Schema.TaggedError<IngestionStoreError>()(
  "IngestionStoreError",
  {
    operation: Schema.String,
    cause: Schema.Unknown,
  },
) {}
