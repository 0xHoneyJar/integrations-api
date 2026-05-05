/**
 * CLI_DESCRIPTOR — concrete singleton for CLI chat medium.
 *
 * Per architect lock A3 (CONST singleton, not factory).
 *
 * Minimal second-medium proof per Phase 0.5 Q2 — the CLI descriptor exists
 * to validate that the L2 registry shape is NOT Discord-only. Any consumer
 * that conditions output on `hasCapability(medium, X)` must work cleanly
 * when given CLI_DESCRIPTOR (and produce ANSI text instead of Discord-only
 * artifacts like custom emoji syntax or sticker references).
 *
 * Sprint 3 R3.7 ships `@0xhoneyjar/cli-renderer` consuming this descriptor
 * to render ruggy + satoshi digest fixtures into ANSI text — proving the
 * registry shape generalizes across mediums.
 *
 * Capability surface (intentionally minimal):
 *   - text  : YES (CLI is text-only · stdout/stderr)
 *   - ansi  : YES (color/style escapes for terminal output)
 *   - embed : NO  (no rich-content surface)
 *   - all interactive surfaces : NO  (CLI is one-shot output, not interactive
 *                                     in the chat-message sense)
 *   - all rich payloads : NO  (custom emoji unicode-fallback is composer's
 *                              job · CLI does not negotiate emoji syntax)
 */

import type { MediumCapability } from "../capability.js";

/**
 * Concrete CLI capability descriptor — minimal text+ANSI surface.
 *
 * `_tag: 'cli'` discriminates this variant. All capability flags besides
 * `text` and `ansi` are `false` — explicit absence rather than implicit
 * gap.
 *
 * `embedFieldsMax: 0` — no embed surface, no field count.
 */
export const CLI_DESCRIPTOR: MediumCapability = {
  _tag: "cli",
  // text shapes
  text: true,
  embed: false,
  attachment: false,
  ansi: true,
  // rich payloads
  customEmoji: false,
  sticker: false,
  stickerSet: false,
  // interactive
  slashCommand: false,
  modal: false,
  button: false,
  inlineKeyboard: false,
  // threading
  thread: false,
  reaction: false,
  mention: false,
  ephemeral: false,
  // bounded numerics
  embedFieldsMax: 0,
};
