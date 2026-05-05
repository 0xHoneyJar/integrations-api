/**
 * Discord descriptors — webhook + interaction contexts (v0.2.0).
 *
 * Per architect lock A3 (descriptors are CONST singletons, NOT factory
 * functions) — singletons enable hasCapability typed accessor inference and
 * constant-folding by the type checker.
 *
 * v0.2.0 SPLITS the prior single `DISCORD_DESCRIPTOR` into:
 *
 *   - DISCORD_WEBHOOK_DESCRIPTOR    — webhook-shape delivery (default for
 *                                      persona-bots ruggy/satoshi/munkh
 *                                      delivered via webhook.send() through
 *                                      the Pattern B shell-bot pattern)
 *
 *   - DISCORD_INTERACTION_DESCRIPTOR — interaction-shape delivery (for
 *                                      slash-command + button + modal flows
 *                                      via discord-renderer in
 *                                      freeside-quests)
 *
 * The architectural rationale (SKP-001 CRITICAL · cycle R sprint 3):
 *   Modal + ephemeral capabilities require an interaction token. They are
 *   NOT available via ordinary webhook delivery. Modeling them as universally
 *   true on a single descriptor was a load-bearing inaccuracy that would
 *   propagate to renderer logic (e.g. the persona-engine could mistakenly
 *   condition on `hasCapability(medium, 'modal')` and produce a payload that
 *   Discord rejects when the delivery shape is webhook-only).
 *
 * Capability surface audit performed against
 * `freeside-quests/packages/discord-renderer/src/`:
 *
 *   - text          : ALL renderers emit string content (both contexts)
 *   - embed         : embed-builder.ts (APIEmbed) · 25-field max enforced upstream
 *   - attachment    : referenced via APIInteractionResponseCallbackData
 *   - customEmoji   : ruggy/satoshi consume `<:emoji_name:id>` syntax via
 *                      freeside-characters/emojis/registry
 *   - sticker       : Discord-specific feature (per-channel stickers)
 *   - slashCommand  : INTERACTION ONLY · slash-command-handler.ts
 *   - modal         : INTERACTION ONLY · modal-handler.ts (TextInputStyle)
 *   - button        : ANY · button-handler.ts (renderable in both contexts)
 *   - thread        : ANY · thread-spawner.ts
 *   - reaction      : ANY · referenced in interaction response payloads
 *   - mention       : ANY · <@user_id>/<#channel_id>/<@&role_id> syntax
 *   - ephemeral     : INTERACTION ONLY · MessageFlags.Ephemeral
 *
 * Sprint 3 R3.9 cross-repo audit verifies every `hasCapability(...)` usage
 * references a key that exists in the relevant descriptor, including the
 * webhook/interaction discrimination.
 *
 * Source authority: discord-api-types/v10
 * https://github.com/discordjs/discord-api-types
 */

import type { MediumCapability } from "../capability.js";

/**
 * Concrete Discord-WEBHOOK capability descriptor.
 *
 * Webhook delivery is what persona-bots use (Pattern B shell-bot · per-message
 * avatar + username override). NO interaction token, so modal + ephemeral
 * are explicitly false.
 *
 * `_tag: 'discord-webhook'` discriminates this variant.
 *
 * `embedFieldsMax: 25` — Discord embed object hard limit per
 * https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
 */
export const DISCORD_WEBHOOK_DESCRIPTOR: MediumCapability = {
  _tag: "discord-webhook",
  // text shapes
  text: true,
  embed: true,
  attachment: true,
  ansi: false,
  // rich payloads
  customEmoji: true,
  sticker: true,
  stickerSet: false, // Telegram-specific concept
  // interactive — webhook context: NO modal · NO ephemeral · NO slash
  slashCommand: false,
  modal: false,
  button: true, // button components are renderable in webhook payloads
  inlineKeyboard: false, // Telegram-only
  // threading
  thread: true,
  reaction: true,
  mention: true,
  ephemeral: false, // ephemeral flag requires interaction token
  // bounded numerics
  embedFieldsMax: 25,
};

/**
 * Concrete Discord-INTERACTION capability descriptor.
 *
 * Interaction delivery means a slash-command, button-press, or modal-submit
 * carrying an interaction token. Full Discord interactive surface available.
 *
 * Used by `freeside-quests/packages/discord-renderer` for /command +
 * button + modal flows.
 *
 * `_tag: 'discord-interaction'` discriminates this variant.
 */
export const DISCORD_INTERACTION_DESCRIPTOR: MediumCapability = {
  _tag: "discord-interaction",
  // text shapes
  text: true,
  embed: true,
  attachment: true,
  ansi: false,
  // rich payloads
  customEmoji: true,
  sticker: true,
  stickerSet: false,
  // interactive — interaction context: ALL Discord interactive caps
  slashCommand: true,
  modal: true,
  button: true,
  inlineKeyboard: false, // Telegram-only
  // threading
  thread: true,
  reaction: true,
  mention: true,
  ephemeral: true,
  // bounded numerics
  embedFieldsMax: 25,
};

/**
 * @deprecated Since v0.2.0 — Discord descriptor was split into Webhook +
 * Interaction contexts (per Cycle R Sprint 3 SKP-001 architectural fix).
 *
 * Use `DISCORD_WEBHOOK_DESCRIPTOR` (default for persona-bots) or
 * `DISCORD_INTERACTION_DESCRIPTOR` (for slash + button + modal flows).
 *
 * This export points to `DISCORD_WEBHOOK_DESCRIPTOR` (the safer default
 * for back-compat — most v0.1.0 consumers were persona-bot-shaped) and will
 * be REMOVED in v1.0.0.
 */
export const DISCORD_DESCRIPTOR: MediumCapability = DISCORD_WEBHOOK_DESCRIPTOR;
