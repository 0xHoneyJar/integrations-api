/**
 * DISCORD_DESCRIPTOR — concrete singleton for Discord chat medium.
 *
 * Per architect lock A3 (descriptors are CONST singletons, NOT factory
 * functions) — singletons enable hasCapability typed accessor inference and
 * constant-folding by the type checker.
 *
 * Capability surface audit performed against
 * `freeside-quests/packages/discord-renderer/src/`:
 *
 *   - text          : ALL renderers emit string content
 *   - embed         : embed-builder.ts (APIEmbed) · 25-field max enforced upstream
 *   - attachment    : referenced via APIInteractionResponseCallbackData
 *   - customEmoji   : ruggy/satoshi consume `<:emoji_name:id>` syntax via
 *                      freeside-characters/emojis/registry
 *   - sticker       : Discord-specific feature (per-channel stickers)
 *   - slashCommand  : slash-command-handler.ts (ApplicationCommandType.ChatInput)
 *   - modal         : modal-handler.ts (TextInputStyle.Short/Paragraph)
 *   - button        : button-handler.ts (ComponentType.Button)
 *   - thread        : thread-spawner.ts
 *   - reaction      : referenced in interaction response payloads
 *   - mention       : <@user_id> + <#channel_id> + <@&role_id> syntax
 *   - ephemeral     : MessageFlags.Ephemeral (used 6+ times in renderers)
 *
 * Sprint 3 R3.9 cross-repo audit will verify every `hasCapability(DISCORD_DESCRIPTOR, KEY)`
 * usage references a key that exists in this descriptor (catches typos at
 * test time).
 *
 * Source authority: discord-api-types/v10
 * https://github.com/discordjs/discord-api-types
 */

import type { MediumCapability } from "../capability.js";

/**
 * Concrete Discord capability descriptor.
 *
 * `_tag: 'discord'` discriminates this variant within MediumCapability.
 * All capability flags below MUST be either `true` or `false` literally
 * (matches the schema's `Schema.Literal(true|false)` shape).
 *
 * `embedFieldsMax: 25` — Discord embed object hard limit per
 * https://discord.com/developers/docs/resources/channel#embed-object-embed-limits
 */
export const DISCORD_DESCRIPTOR: MediumCapability = {
  _tag: "discord",
  // text shapes
  text: true,
  embed: true,
  attachment: true,
  ansi: false,
  // rich payloads
  customEmoji: true,
  sticker: true,
  stickerSet: false, // Telegram-specific concept
  // interactive
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
