/**
 * IngestionResult — what PERSISTENCE did (SDD §11.1 / §16.3 / §16.5).
 *
 * `idempotencyKey` is the composite (tenant∷provider∷conn∷id) — NOT the raw
 * upstreamEventId, which is carried optionally alongside (§16.5). `Conflict` is
 * a DISTINCT terminal (§16.3): a stored key re-seen with a different digest is
 * never laundered into a `Committed`.
 */
import { Schema } from "effect";
import { IngestionDisposition } from "./disposition.js";

const Sha256Hex = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

export class Committed extends Schema.TaggedClass<Committed>()("Committed", {
  idempotencyKey: Schema.NonEmptyString,
  upstreamEventId: Schema.optional(Schema.String),
  disposition: IngestionDisposition,
}) {}

export class Duplicate extends Schema.TaggedClass<Duplicate>()("Duplicate", {
  idempotencyKey: Schema.NonEmptyString,
  upstreamEventId: Schema.optional(Schema.String),
}) {}

export class Conflict extends Schema.TaggedClass<Conflict>()("Conflict", {
  idempotencyKey: Schema.NonEmptyString,
  priorDigest: Sha256Hex,
  newDigest: Sha256Hex,
}) {}

export const IngestionResult = Schema.Union(Committed, Duplicate, Conflict);
export type IngestionResult = typeof IngestionResult.Type;
