/**
 * Drift-catch — assert no Discord-only artifacts in CLI-bound voice.
 *
 * Per SDD §5.6 (architect lock A2 + cycle R · cmp-boundary-architecture).
 *
 * Used by all cli-renderer entry points (renderDigest/Micro/Weaver). If
 * the upstream composer accidentally emits Discord-shaped text for a CLI
 * delivery, this guard throws. Catches:
 *
 *   1. Custom emoji syntax `<:name:id>` or `<a:name:id>` (animated)
 *   2. Ephemeral flag references (`MessageFlags.Ephemeral`)
 *   3. Discord interaction-token references
 *
 * The point is to fail LOUDLY at render time rather than silently emit
 * Discord-shaped text in a CLI session.
 */

const DISCORD_CUSTOM_EMOJI = /<a?:[\w]+:\d+>/;
const DISCORD_EPHEMERAL_FLAG = /MessageFlags\.Ephemeral/;
const DISCORD_USER_MENTION = /<@!?\d{17,19}>/;
const DISCORD_CHANNEL_MENTION = /<#\d{17,19}>/;
const DISCORD_ROLE_MENTION = /<@&\d{17,19}>/;

/**
 * Throws if Discord-only artifacts present.
 *
 * Note: bare `<@user>` mentions are also caught — CLI has no concept of
 * Discord user IDs and a leak indicates upstream cmp-boundary failure.
 */
export function assertNoDiscordArtifacts(text: string): void {
  if (DISCORD_CUSTOM_EMOJI.test(text)) {
    throw new Error(
      "cli-renderer received Discord custom emoji syntax (<:name:id>) — composer should suppress for CLI medium",
    );
  }
  if (DISCORD_EPHEMERAL_FLAG.test(text)) {
    throw new Error(
      "cli-renderer received Discord MessageFlags.Ephemeral reference — interaction-only flag should not appear in CLI output",
    );
  }
  if (DISCORD_USER_MENTION.test(text)) {
    throw new Error(
      "cli-renderer received Discord user mention <@id> — substrate ID leaked through cmp-boundary",
    );
  }
  if (DISCORD_CHANNEL_MENTION.test(text)) {
    throw new Error(
      "cli-renderer received Discord channel mention <#id> — substrate ID leaked through cmp-boundary",
    );
  }
  if (DISCORD_ROLE_MENTION.test(text)) {
    throw new Error(
      "cli-renderer received Discord role mention <@&id> — substrate ID leaked through cmp-boundary",
    );
  }
}
