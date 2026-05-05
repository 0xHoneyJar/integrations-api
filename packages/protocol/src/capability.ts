/**
 * MediumCapability — sealed Effect Schema for chat-medium presentation capabilities.
 *
 * The L2 boundary layer between L1 character config and L3 cmp-boundary
 * transforms. Answers: "what can THIS chat medium render?"
 *
 * Per [[chat-medium-presentation-boundary]] doctrine and SDD §3 + §5.1
 * (cycle R · 2026-05-04 · cmp-boundary-architecture). 4 sealed variants:
 *
 *   - DiscordDescriptor  — full surface (text + embed + attachment +
 *                           customEmoji + sticker + slash + modal + button +
 *                           thread + reaction + ephemeral + mention)
 *   - CliDescriptor      — minimal (text + ansi only · all Discord caps false)
 *   - TelegramStub       — documented stub for future telegram-renderer cycle
 *                          (text + photo + sticker + stickerSet +
 *                          inlineKeyboard + botCommand surface to be filled)
 *
 * Each variant carries a `_tag` literal for type narrowing per architect lock
 * A2 (matches `@0xhoneyjar/quests-protocol/substrate-step.ts` Union pattern,
 * proven 2026-05-03).
 *
 * All descriptor variants declare the SAME field set — variants only differ
 * in field values (true/false, numeric ceilings). This enables:
 *   1. uniform `hasCapability(any-descriptor, key)` accessor without `_tag`
 *      dispatch (architect lock A3)
 *   2. cross-medium audit at the type level — adding a Discord-only field
 *      forces the CLI + Telegram descriptors to declare its absence
 *      explicitly (no shadowed silent gaps)
 *   3. additive minor bumps when new capability fields land — extend the
 *      shared field set, default false in existing descriptors, true where
 *      the medium supports it
 *
 * NEVER: extend with a field that has different shape across variants.
 * Use sibling primitives (asset-pipeline ConsumerConstraint for size ceilings;
 * future per-medium auth + rate-limit primitives) per SDD §3.3 sibling
 * pattern lock.
 */

import { Schema } from "effect";

// ---------------------------------------------------------------------------
// Shared capability field set — every descriptor variant declares all of them.
// ---------------------------------------------------------------------------

/**
 * Shared capability surface across mediums. Each variant sets these fields
 * with literal types, enabling type-narrowed hasCapability + cross-medium
 * audit.
 *
 * The field set is ADDITIVE — adding a new capability is a minor bump.
 * Removing or renaming is a major bump requiring migration plan.
 *
 * Field categories:
 *   - text shapes: text · embed · attachment · ansi
 *   - rich payloads: customEmoji · sticker · stickerSet
 *   - interactive: slashCommand · modal · button · inlineKeyboard
 *   - threading: thread · reaction · mention · ephemeral
 *   - bounded numerics: embedFieldsMax (Discord 25 · CLI 0 · Telegram TBD)
 *
 * Defaults explicit in each descriptor — no inherited "presence implied"
 * semantics. CLI explicitly says `embed: false` rather than omitting it.
 */

// ---------------------------------------------------------------------------
// DiscordDescriptor — full surface
// ---------------------------------------------------------------------------

/**
 * Discord capabilities. Authority: `discord-api-types/v10` enum surface
 * consumed by `freeside-quests/packages/discord-renderer` (audited Sprint 3
 * R3.9 cross-repo audit test).
 *
 * Numeric ceiling `embedFieldsMax: 25` matches Discord embed limit.
 * https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
 */
const DiscordDescriptor = Schema.Struct({
  _tag: Schema.Literal("discord"),
  // text shapes
  text: Schema.Literal(true),
  embed: Schema.Literal(true),
  attachment: Schema.Literal(true),
  ansi: Schema.Literal(false),
  // rich payloads
  customEmoji: Schema.Literal(true),
  sticker: Schema.Literal(true),
  stickerSet: Schema.Literal(false), // Telegram-specific concept; Discord has individual stickers
  // interactive
  slashCommand: Schema.Literal(true),
  modal: Schema.Literal(true),
  button: Schema.Literal(true),
  inlineKeyboard: Schema.Literal(false), // Telegram-only
  // threading
  thread: Schema.Literal(true),
  reaction: Schema.Literal(true),
  mention: Schema.Literal(true),
  ephemeral: Schema.Literal(true),
  // bounded numerics
  embedFieldsMax: Schema.Literal(25),
}).pipe(Schema.annotations({ identifier: "DiscordDescriptor" }));

// ---------------------------------------------------------------------------
// CliDescriptor — minimal · text + ANSI only
// ---------------------------------------------------------------------------

/**
 * CLI capabilities. Minimal surface — second-medium proof per Phase 0.5 Q2.
 * All Discord caps explicitly false; only `text` and `ansi` are true.
 *
 * Used by loa-finn substrate fixtures + future cli-renderer (Sprint 3 R3.7).
 */
const CliDescriptor = Schema.Struct({
  _tag: Schema.Literal("cli"),
  // text shapes
  text: Schema.Literal(true),
  embed: Schema.Literal(false),
  attachment: Schema.Literal(false),
  ansi: Schema.Literal(true),
  // rich payloads
  customEmoji: Schema.Literal(false),
  sticker: Schema.Literal(false),
  stickerSet: Schema.Literal(false),
  // interactive
  slashCommand: Schema.Literal(false),
  modal: Schema.Literal(false),
  button: Schema.Literal(false),
  inlineKeyboard: Schema.Literal(false),
  // threading
  thread: Schema.Literal(false),
  reaction: Schema.Literal(false),
  mention: Schema.Literal(false),
  ephemeral: Schema.Literal(false),
  // bounded numerics
  embedFieldsMax: Schema.Literal(0),
}).pipe(Schema.annotations({ identifier: "CliDescriptor" }));

// ---------------------------------------------------------------------------
// TelegramStub — documented placeholder
// ---------------------------------------------------------------------------

/**
 * Telegram stub. Sprint 2 lands this as a *documented* placeholder — the
 * full telegram-renderer cycle will fill the actual capability surface.
 *
 * Documented future capabilities to fill:
 *   - photo (canvas) — different from Discord's `attachment` semantics
 *   - sticker (single) — Telegram has one-per-message vs Discord's per-channel
 *   - stickerSet — Telegram-specific concept (curated set of stickers per bot)
 *   - inlineKeyboard — Telegram-specific (buttons rendered inline w/ message)
 *   - botCommand — Telegram-specific (slash without argument typing of Discord)
 *
 * For Sprint 2 round-trip decode validation, `text: true` + everything else
 * `false` matches the doctrine ("strictest stub possible").
 *
 * @future telegram-renderer cycle — replace stub with full descriptor
 */
const TelegramStub = Schema.Struct({
  _tag: Schema.Literal("telegram-stub"),
  // text shapes
  text: Schema.Literal(true),
  embed: Schema.Literal(false), // Telegram has no native embed; uses photo+caption
  attachment: Schema.Literal(false),
  ansi: Schema.Literal(false),
  // rich payloads
  customEmoji: Schema.Literal(false),
  sticker: Schema.Literal(false),
  stickerSet: Schema.Literal(false), // future telegram-renderer cycle fills
  // interactive
  slashCommand: Schema.Literal(false),
  modal: Schema.Literal(false),
  button: Schema.Literal(false),
  inlineKeyboard: Schema.Literal(false), // future telegram-renderer cycle fills
  // threading
  thread: Schema.Literal(false),
  reaction: Schema.Literal(false),
  mention: Schema.Literal(false),
  ephemeral: Schema.Literal(false),
  // bounded numerics
  embedFieldsMax: Schema.Literal(0),
}).pipe(Schema.annotations({ identifier: "TelegramStub" }));

// ---------------------------------------------------------------------------
// MediumCapability — sealed discriminated union
// ---------------------------------------------------------------------------

/**
 * Sealed discriminated union of all chat-medium capability descriptors.
 *
 * `Schema.decodeUnknownSync(MediumCapability)(json)` validates a raw payload
 * against the full union; returns the typed variant on success, throws
 * ParseError on decode failure (consumer falls back to registry default per
 * SDD §8 error taxonomy).
 *
 * Discriminator: `_tag` literal. Per architect lock A2.
 *
 * Adding a new variant (e.g. `WebDescriptor` for HTML/React, `AgoraCanvasDescriptor`
 * for in-dimensions chat) is an additive minor bump — extend the Union, ship
 * a new descriptor singleton, no breaking change for existing consumers.
 */
export const MediumCapability = Schema.Union(
  DiscordDescriptor,
  CliDescriptor,
  TelegramStub,
);

export type MediumCapability = Schema.Schema.Type<typeof MediumCapability>;

/**
 * Encoded shape of MediumCapability — the wire format. Identical to the
 * type form because all fields are literals.
 */
export type MediumCapabilityEncoded = Schema.Schema.Encoded<typeof MediumCapability>;

/**
 * Discriminator literal type — useful for typed switch over current medium.
 */
export type MediumId = MediumCapability["_tag"];

// ---------------------------------------------------------------------------
// Per-variant Schema exports — for narrow consumer use cases
// ---------------------------------------------------------------------------

/**
 * Discord-only schema export. Use when a consumer wants to validate a
 * payload as specifically a Discord descriptor (rejects CLI/Telegram).
 *
 * Most consumers want `MediumCapability` (the full Union); `DiscordSchema`
 * is for narrow-validation entry points.
 */
export const DiscordSchema = DiscordDescriptor;
export type DiscordCapability = Schema.Schema.Type<typeof DiscordDescriptor>;

/**
 * CLI-only schema export. Same narrow-validation use case.
 */
export const CliSchema = CliDescriptor;
export type CliCapability = Schema.Schema.Type<typeof CliDescriptor>;

/**
 * Telegram-only schema export. Same narrow-validation use case.
 */
export const TelegramSchema = TelegramStub;
export type TelegramCapability = Schema.Schema.Type<typeof TelegramStub>;
