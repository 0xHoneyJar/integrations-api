/**
 * Provider — the sealed set of integration providers this building supports.
 *
 * Discord is the wave-1 reference vertical; telegram + luma are admitted in the
 * union (so unknown-provider dispositions are reachable — SDD §16.8) but have no
 * adapter this wave. Adding a provider is additive.
 */
import { Schema } from "effect";

export const Provider = Schema.Literal("discord", "telegram", "luma");
export type Provider = typeof Provider.Type;
