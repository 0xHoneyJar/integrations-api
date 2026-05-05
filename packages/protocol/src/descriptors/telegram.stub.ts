/**
 * TELEGRAM_STUB — documented placeholder for the Telegram chat medium.
 *
 * Per architect lock A3 (CONST singleton, not factory).
 *
 * Sprint 2 ships this as a STUB — the full telegram-renderer cycle (FUTURE,
 * not in this cycle's scope per PRD §10 explicit out-of-scope) will replace
 * the body of this module with the actual capability surface.
 *
 * @future telegram-renderer cycle
 *   When that cycle fires, fill the surface below per Telegram Bot API
 *   https://core.telegram.org/bots/api:
 *
 *   - photo (canvas) — Telegram has photos with captions; not "embed" semantics
 *   - sticker — Telegram has WebP stickers, one-per-message (Discord allows
 *               multiple); part of curated sticker sets
 *   - stickerSet — curated set of stickers per bot (Telegram-specific concept)
 *   - inlineKeyboard — buttons rendered inline w/ message; supports URL/CALLBACK
 *                      data + multi-row layout (analogous to Discord ActionRow)
 *   - botCommand — Telegram-specific (`/help`, `/start`); slash without
 *                  argument typing of Discord ApplicationCommand
 *   - inline-mode (search-as-you-type) — discoverable via `@botname query`
 *
 * Sprint 2 stub captures the bare minimum (text=true, everything else false)
 * for round-trip Schema decode validation. The MediumCapability schema
 * forces every field to be declared — adding new fields to the shared set
 * (capability.ts) will force this stub to declare its absence too, no
 * silent drift.
 */

import type { MediumCapability } from "../capability.js";

/**
 * Telegram stub descriptor — Sprint 2 placeholder.
 *
 * `_tag: 'telegram-stub'` differentiates this from a *real* telegram
 * descriptor. Future cycle should ship `_tag: 'telegram'` as the production
 * variant and DEPRECATE this stub with a `@deprecated` JSDoc tag.
 *
 * Today: text=true (Telegram is at minimum a text medium); everything else
 * false to keep the stub honest about what is NOT yet implemented.
 */
export const TELEGRAM_STUB: MediumCapability = {
  _tag: "telegram-stub",
  // text shapes
  text: true,
  embed: false, // Telegram has no native embed; uses photo+caption (filled in future cycle)
  attachment: false,
  ansi: false,
  // rich payloads
  customEmoji: false,
  sticker: false, // future telegram-renderer cycle fills (single + per-message)
  stickerSet: false, // future telegram-renderer cycle fills (curated set)
  // interactive
  slashCommand: false,
  modal: false,
  button: false,
  inlineKeyboard: false, // future telegram-renderer cycle fills
  // threading
  thread: false,
  reaction: false,
  mention: false,
  ephemeral: false,
  // bounded numerics
  embedFieldsMax: 0,
};
