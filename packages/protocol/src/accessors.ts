/**
 * Typed accessors over MediumCapability descriptors.
 *
 * Per SDD §5.1 + §7.1 + §12.E (cycle R · cmp-boundary-architecture).
 *
 * Three accessors:
 *   - hasCapability(descriptor, key)  — boolean check; uniform across variants
 *   - pickCapability(descriptor, key) — value access (boolean OR numeric)
 *   - mediumIdOf(descriptor)          — extract `_tag` for typed switch
 *
 * Why uniform accessors: per architect lock A3, all descriptor variants
 * declare the SAME field set (capability.ts). This means an accessor that
 * reads `descriptor[key]` works on any variant without `_tag` dispatch —
 * the Discord descriptor's `sticker: true` and the CLI descriptor's
 * `sticker: false` both satisfy the read operation.
 *
 * Type-narrowing: accessors take `MediumCapability` (the Union) as input.
 * Consumers with a known variant should use the concrete singleton directly
 * (`hasCapability(DISCORD_DESCRIPTOR, 'sticker')`) and let TypeScript narrow.
 */

import type { MediumCapability, MediumId } from "./capability.js";

// ---------------------------------------------------------------------------
// Capability key types
// ---------------------------------------------------------------------------

/**
 * All capability field names that exist on every descriptor variant.
 * Excludes the `_tag` discriminator.
 *
 * Adding a new field to the shared set in capability.ts auto-extends this
 * union — accessors get the new key for free.
 */
export type CapabilityKey = Exclude<keyof MediumCapability, "_tag">;

// ---------------------------------------------------------------------------
// hasCapability — boolean check
// ---------------------------------------------------------------------------

/**
 * Boolean check whether a descriptor has a capability.
 *
 * For boolean-typed fields (the common case), returns the field value.
 * For numeric-typed fields (e.g. `embedFieldsMax`), returns `true` iff
 * the value is greater than zero — interprets "field count > 0" as
 * "this medium supports embeds with fields."
 *
 * Examples:
 *   hasCapability(DISCORD_DESCRIPTOR, 'sticker')        // true
 *   hasCapability(CLI_DESCRIPTOR, 'sticker')            // false
 *   hasCapability(DISCORD_DESCRIPTOR, 'embedFieldsMax') // true (25 > 0)
 *   hasCapability(CLI_DESCRIPTOR, 'embedFieldsMax')     // false (0 > 0 is false)
 *
 * Use `pickCapability` when you need the actual value (e.g. the field count
 * to bound an embed builder loop).
 */
export function hasCapability(
  descriptor: MediumCapability,
  key: CapabilityKey,
): boolean {
  const value = descriptor[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  // Defensive: any future field type defaults to truthy-coerce. This branch
  // is unreachable given current schema but future-proofs the accessor.
  return Boolean(value);
}

// ---------------------------------------------------------------------------
// pickCapability — value access
// ---------------------------------------------------------------------------

/**
 * Returns the actual value of a capability field. Use when boolean coercion
 * loses information (e.g. `embedFieldsMax` returns 25 for Discord vs 0 for
 * CLI — the actual numeric ceiling matters for embed builder loops).
 *
 * The return type is the precise field type at the keyed position. Consumers
 * that pick a known-boolean field get a boolean; consumers that pick
 * `embedFieldsMax` get a number.
 *
 * Examples:
 *   pickCapability(DISCORD_DESCRIPTOR, 'sticker')        // true (boolean)
 *   pickCapability(DISCORD_DESCRIPTOR, 'embedFieldsMax') // 25 (number)
 *   pickCapability(CLI_DESCRIPTOR, 'embedFieldsMax')     // 0  (number)
 */
export function pickCapability<K extends CapabilityKey>(
  descriptor: MediumCapability,
  key: K,
): MediumCapability[K] {
  return descriptor[key];
}

// ---------------------------------------------------------------------------
// mediumIdOf — discriminator extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the `_tag` discriminator from a descriptor. Useful for typed
 * switch statements over the current medium without consumer awareness of
 * the schema.
 *
 * Examples:
 *   mediumIdOf(DISCORD_DESCRIPTOR)  // 'discord'
 *   mediumIdOf(CLI_DESCRIPTOR)      // 'cli'
 *   mediumIdOf(TELEGRAM_STUB)       // 'telegram-stub'
 *
 * Pair with a typed switch:
 *   switch (mediumIdOf(currentMedium)) {
 *     case 'discord':       // ...
 *     case 'cli':           // ...
 *     case 'telegram-stub': // ...
 *   }
 *
 * The return type narrows to MediumId — adding a new variant to the union
 * automatically extends the switch's exhaustiveness check.
 */
export function mediumIdOf(descriptor: MediumCapability): MediumId {
  return descriptor._tag;
}
