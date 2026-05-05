/**
 * MediumCapabilityOverrides + TokenBinding — per-character / per-token
 * customization shapes.
 *
 * Per SDD §3.2 + §5.1 + §6.1 (cycle R · cmp-boundary-architecture).
 *
 * Two-tier binding pattern (SDD §3.2 lock):
 *   1. Per-character `mediumOverrides` (default tier) — one wardrobe across
 *      all instances of this character. Set on `CharacterConfig`.
 *   2. Per-token `tokenBinding` (override tier) — when set AND wardrobe-resolver
 *      returns non-null, EACH token of this contract resolves its OWN medium
 *      capabilities from the bound NFT's L0 metadata.
 *
 * Resolution precedence (per SDD §3.2):
 *   1. tokenBinding set + resolver returns override → use L0 metadata
 *   2. mediumOverrides set                          → use character-level
 *   3. otherwise                                    → use registry default
 *
 * Sprint 4 ships:
 *   - freeside-characters/types.ts CharacterConfig.{mediumOverrides?,tokenBinding?}
 *     — additive optional fields (per architect lock A7)
 *   - freeside-characters/deliver/wardrobe-resolver.ts SCAFFOLD with
 *     `@future mibera-as-NPC cycle-3` marker (per architect lock A6)
 *   - freeside-storage/protocol/metadata-document.ts MetadataDocument.medium_capabilities?
 *     — additive v1.4.0 bump (per architect lock A7)
 *
 * Cycle-3 (mibera-as-NPC, gated on loa-finn#157) fills the resolver body.
 */

import { Schema } from "effect";
import { MediumCapability } from "./capability.js";

// ---------------------------------------------------------------------------
// TokenBinding — pointer from L1 character config to L0 NFT metadata
// ---------------------------------------------------------------------------

/**
 * Pointer from L1 CharacterConfig to L0 NFT metadata. When set on a
 * character, the wardrobe-resolver (cycle-3 fills) reads the bound token's
 * `medium_capabilities` field and uses it as override.
 *
 * `contract` — EVM address (0x prefix · 40 hex chars). Lowercase canonical.
 * `tokenId` — string for u256 safety (token IDs can exceed Number.MAX_SAFE_INTEGER).
 * `resolverHint` — optional fetch-strategy advisory; cycle-3 may use it to
 *                  skip strategy negotiation.
 *
 * Per SDD §3.2 lock + cycle-3 mibera-as-NPC §6.5 sequence sketch.
 */
export const TokenBinding = Schema.Struct({
  contract: Schema.String.pipe(
    Schema.pattern(/^0x[a-fA-F0-9]{40}$/),
    Schema.annotations({
      identifier: "EvmAddress",
      description: "EVM address — 0x prefix + 40 hex chars",
    }),
  ),
  tokenId: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({
      identifier: "TokenId",
      description: "Token ID — string for u256 safety",
    }),
  ),
  resolverHint: Schema.optional(
    Schema.Literal("manifest-document", "cf-function-kv"),
  ),
}).pipe(Schema.annotations({ identifier: "TokenBinding" }));

export type TokenBinding = Schema.Schema.Type<typeof TokenBinding>;

// ---------------------------------------------------------------------------
// MediumCapabilityOverrides — sparse per-medium override map
// ---------------------------------------------------------------------------

/**
 * Sparse per-medium override map. Keys are mediumIds (`'discord'`, `'cli'`,
 * `'telegram-stub'`); values are partial MediumCapability shapes that
 * replace specific fields of the registry default.
 *
 * "Sparse" semantics — a character that wants to override Discord stickers
 * but inherit everything else writes:
 *   { discord: { sticker: false } }
 *
 * The composer applies overrides on top of the registry default. Fields
 * not present in the override are inherited from the registry.
 *
 * Per SDD §3.2 + §6.1. Sparse Record (not strict union per SDD §12.E
 * resolution) — allows L0 metadata to declare `{ discord: {...} }` without
 * forcing the L0 producer to emit complete CLI + Telegram override blocks
 * too.
 *
 * Type-level note: the value shape is `Record<string, unknown>` at the
 * Effect Schema level (we cannot express a per-key partial of the
 * discriminated Union without `Schema.suspend` cycles). At the TypeScript
 * type level we type the value as `Partial<MediumCapability>` for consumer
 * ergonomics; runtime validation is done at the override-application site
 * (composer in Sprint 3 / wardrobe-resolver in cycle-3).
 *
 * Architectural rationale for soft typing here: per SDD §3.2, override
 * authority lives at the consumer (composer/wardrobe-resolver), not at the
 * registry. The registry's job is to expose the override SHAPE, not to
 * police every override against the discriminated union (which would make
 * additive descriptor adds breaking changes for L0 metadata producers).
 */
export const MediumCapabilityOverrides = Schema.Record({
  key: Schema.String,
  value: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
}).pipe(Schema.annotations({ identifier: "MediumCapabilityOverrides" }));

export type MediumCapabilityOverrides = {
  readonly [mediumId: string]: Partial<MediumCapability>;
};

// ---------------------------------------------------------------------------
// CharacterMediumBinding — composite shape for CharacterConfig extension
// ---------------------------------------------------------------------------

/**
 * Composite shape that Sprint 4 will use to extend CharacterConfig with
 * BOTH override tiers. Importing this from medium-registry keeps the L1
 * extension shape sourced at L2 — single source of truth.
 *
 * `freeside-characters/packages/persona-engine/src/types.ts` will import
 * this in Sprint 4 R4.4:
 *
 *   import type { CharacterMediumBinding } from '@0xhoneyjar/medium-registry';
 *   interface CharacterConfig {
 *     ...
 *     readonly mediumOverrides?: MediumCapabilityOverrides;
 *     readonly tokenBinding?: TokenBinding;
 *   }
 *
 * Both fields are optional — additive bump per architect lock A7.
 */
export interface CharacterMediumBinding {
  readonly mediumOverrides?: MediumCapabilityOverrides;
  readonly tokenBinding?: TokenBinding;
}
