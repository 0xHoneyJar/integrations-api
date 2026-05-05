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
 * v0.2.0 — Discord context split (SKP-001 architectural fix):
 *   - DISCORD_WEBHOOK_DESCRIPTOR (no modal · no ephemeral)
 *   - DISCORD_INTERACTION_DESCRIPTOR (full interactive surface)
 *   - DISCORD_DESCRIPTOR retained as deprecated alias to webhook (back-compat)
 *
 * Public API:
 *
 *   - MediumCapability (sealed Schema · 4-variant discriminated union)
 *   - DISCORD_WEBHOOK_DESCRIPTOR · DISCORD_INTERACTION_DESCRIPTOR
 *     CLI_DESCRIPTOR · TELEGRAM_STUB (concrete singletons)
 *   - DISCORD_DESCRIPTOR (deprecated alias to webhook · removed v1.0.0)
 *   - hasCapability · pickCapability · mediumIdOf (typed accessors)
 *   - MediumCapabilityOverrides + TokenBinding + CharacterMediumBinding (override shapes)
 *   - MEDIUM_REGISTRY_VERSION (semver string)
 */

// ---------------------------------------------------------------------------
// Sealed Schema + variant types
// ---------------------------------------------------------------------------

export {
  MediumCapability,
  DiscordWebhookSchema,
  DiscordInteractionSchema,
  DiscordSchema,
  CliSchema,
  TelegramSchema,
} from "./capability.js";

export type {
  MediumCapability as MediumCapabilityType,
  MediumCapabilityEncoded,
  MediumId,
  DiscordWebhookCapability,
  DiscordInteractionCapability,
  DiscordCapability,
  CliCapability,
  TelegramCapability,
} from "./capability.js";

// ---------------------------------------------------------------------------
// Concrete descriptors (CONST singletons per architect lock A3)
// ---------------------------------------------------------------------------

export {
  DISCORD_WEBHOOK_DESCRIPTOR,
  DISCORD_INTERACTION_DESCRIPTOR,
  DISCORD_DESCRIPTOR,
} from "./descriptors/discord.js";
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
 *
 * v0.1.0 — initial release with single Discord descriptor (Sprint 2)
 * v0.2.0 — Discord context split (Webhook + Interaction) per SKP-001
 *          architectural fix. DISCORD_DESCRIPTOR retained as deprecated
 *          alias to webhook for back-compat; will be removed in v1.0.0.
 */
export const MEDIUM_REGISTRY_VERSION = "0.2.0" as const;
