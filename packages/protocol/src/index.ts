/**
 * `@0xhoneyjar/medium-registry` — sealed Effect Schema for chat-medium
 * presentation capabilities.
 *
 * The L2 boundary layer between L1 character config and L3 cmp-boundary
 * transforms. Cycle R · cmp-boundary-architecture (2026-05-04).
 *
 * Per architect locks A1-A8 in `~/bonfire/grimoires/loa/sdd.md`:
 *   - A1: standalone repo `freeside-mediums`, published as `@0xhoneyjar/medium-registry`
 *   - A2: Schema.Union(...) discriminated by `_tag` literal
 *   - A3: Descriptors are CONST singletons, not factory functions
 *   - A5: `effect: ^3.10.0` declared as peerDependency
 *   - A7: Additive-only schema bumps (forward-compat lock for cycle-Q-style migrations)
 *
 * Public API:
 *
 *   - MediumCapability (sealed Schema · discriminated union)
 *   - DISCORD_DESCRIPTOR · CLI_DESCRIPTOR · TELEGRAM_STUB (concrete singletons)
 *   - hasCapability · pickCapability · mediumIdOf (typed accessors)
 *   - MediumCapabilityOverrides + TokenBinding + CharacterMediumBinding (override shapes)
 *   - MEDIUM_REGISTRY_VERSION (semver string)
 */

// ---------------------------------------------------------------------------
// Sealed Schema + variant types
// ---------------------------------------------------------------------------

export {
  MediumCapability,
  DiscordSchema,
  CliSchema,
  TelegramSchema,
} from "./capability.js";

export type {
  MediumCapability as MediumCapabilityType,
  MediumCapabilityEncoded,
  MediumId,
  DiscordCapability,
  CliCapability,
  TelegramCapability,
} from "./capability.js";

// ---------------------------------------------------------------------------
// Concrete descriptors (CONST singletons per architect lock A3)
// ---------------------------------------------------------------------------

export { DISCORD_DESCRIPTOR } from "./descriptors/discord.js";
export { CLI_DESCRIPTOR } from "./descriptors/cli.js";
export { TELEGRAM_STUB } from "./descriptors/telegram.stub.js";

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------

export {
  hasCapability,
  pickCapability,
  mediumIdOf,
} from "./accessors.js";

export type { CapabilityKey } from "./accessors.js";

// ---------------------------------------------------------------------------
// Override + binding shapes (consumed by Sprint 4 + cycle-3)
// ---------------------------------------------------------------------------

export {
  MediumCapabilityOverrides,
  TokenBinding,
} from "./overrides.js";

export type {
  MediumCapabilityOverrides as MediumCapabilityOverridesType,
  TokenBinding as TokenBindingType,
  CharacterMediumBinding,
} from "./overrides.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Semver string for the medium-registry contract.
 *
 * Bumps follow loa-constructs/.claude/schemas/VERSIONING.md:
 *   - additive minor: new descriptor variant or new shared field with
 *     defaults explicit on existing variants
 *   - major: rename or removal of capability key, descriptor variant
 *     deprecation, behavioral change to accessor semantics
 */
export const MEDIUM_REGISTRY_VERSION = "0.1.0" as const;
