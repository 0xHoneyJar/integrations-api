/**
 * config-types.ts — the narrow C-1 type surface this renderer consumes.
 *
 * ── Provenance ────────────────────────────────────────────────────────────
 * These types are the FAITHFUL, field-for-field shape of
 * `@freeside-worlds/config-protocol` `surface-config.ts` (C-1, MERGED on
 * freeside-worlds master). They are the TS-derived types of the canonical
 * Effect.Schema in that package — the SAME types `S.Schema.Type<typeof Theme>`
 * etc. resolve to. Source of truth:
 *
 *   freeside-worlds/packages/config-protocol/surface-config.ts
 *     · Theme / ThemeBranding / PageLayout / ComponentInstance / ComponentProps
 *     · VerifyMessageCopy / VerifyMessageConfig
 *     · SurfaceConfig<Surface> wire envelope (schema_version 1.0)
 *
 * ── Why re-declared here rather than imported ─────────────────────────────
 * `@freeside-worlds/config-protocol` is `private: true` and authored against
 * `@effect/schema@^0.75` (the standalone package), whereas freeside-mediums
 * standardizes on `effect`'s built-in `Schema` (effect@^3.10 — the cluster's
 * current convention, see medium-registry `packages/protocol`). The two are
 * the same Effect.Schema engine but different import surfaces. Per the kickoff
 * directive ("consume as a SOURCE-DISTRIBUTED package for TYPES"), this module
 * is the source-distributed type contract pinned into the consumer.
 *
 * When the cluster's git-tarball source-distribution lands (operator memory
 * `sovereign-code-distribution`, 2026-05-26: SHA-pinned bun git install), this
 * file becomes a thin re-export:
 *
 *   export type { Theme, SurfaceConfig, VerifyMessageConfig, ... }
 *     from '@freeside-worlds/config-protocol';
 *
 * No runtime/structural change is required at that swap — these are the SAME
 * shapes. The renderer never decodes config (the config-service already
 * validated it write-side, fail-closed → 422); it only READS already-bounded
 * fields. So a structural-typing re-declaration is sufficient and keeps this
 * package's build hermetic.
 *
 * ── The RENDER-CONTRACT seam ──────────────────────────────────────────────
 * config-protocol's RENDER-CONTRACT.md splits the BLOCKER-1 defense:
 *   · WRITE-side (config-protocol + config-engine) = medium-agnostic VALIDATION
 *     (bounded length, closed props slot-schema, control-byte rejection).
 *   · RENDER-side (THIS package, bead arrakis-4re1 / C-5) = medium-specific
 *     ESCAPING (Discord markdown). The store emits raw-but-bounded; this
 *     renderer MUST escape per-medium before output.
 */

// ─── Jani's sietch Theme model (faithful to config-protocol surface-config.ts) ─

/**
 * ComponentProps — the BLOCKER-1 closed slot-schema (config-protocol
 * `ComponentProps`). A bounded, closed set of allowed display/layout slots;
 * the write-side already rejected unknown keys + over-length + control bytes.
 * The renderer treats every string slot as UNTRUSTED-but-bounded and escapes
 * it for Discord before output.
 */
export interface ComponentProps {
  // Text / content slots (CM-editable display strings).
  readonly content?: string;
  readonly title?: string;
  readonly heading?: string;
  readonly subheading?: string;
  readonly label?: string;
  readonly text?: string;
  // Enum-ish layout strings (bounded; renderer maps a fixed set, ignores rest).
  readonly layout?: string;
  readonly textAlign?: string;
  readonly maxWidth?: string;
  readonly direction?: string;
  readonly gap?: string;
  readonly padding?: string;
  readonly background?: string;
  readonly borderRadius?: string;
  // Reference ids (resolved server-side elsewhere — NOT rendered as prose).
  readonly contractId?: string;
  readonly collectionId?: string;
  // Numeric slots (bounded integers).
  readonly columns?: number;
  readonly maxEntries?: number;
  readonly maxItems?: number;
  // Boolean display toggles.
  readonly showRank?: boolean;
  readonly showAvatar?: boolean;
  readonly showChange?: boolean;
  readonly showMetadata?: boolean;
  readonly showOwner?: boolean;
  readonly showWallet?: boolean;
  readonly showBalance?: boolean;
  readonly showRoles?: boolean;
  readonly showStats?: boolean;
}

/** Jani's ComponentInstance — recursive tree (config-protocol `ComponentInstance`). */
export interface ComponentInstance {
  readonly id: string;
  readonly type: string;
  readonly props: ComponentProps;
  readonly children?: ReadonlyArray<ComponentInstance> | undefined;
}

export interface PageLayout {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly components: ReadonlyArray<ComponentInstance>;
}

export interface FontSpec {
  readonly family: string;
  readonly weight: number;
}

export interface ThemeBranding {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
    readonly background: string;
    readonly surface: string;
    readonly text: string;
  };
  readonly fonts: {
    readonly heading: FontSpec;
    readonly body: FontSpec;
  };
  readonly borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  readonly spacing: 'compact' | 'comfortable' | 'spacious';
}

export interface Theme {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly branding: ThemeBranding;
  readonly pages: ReadonlyArray<PageLayout>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ─── The V1 verify-message surface (config-protocol VerifyMessageConfig) ──────

/** The editable text shown on the verify surface. All fields are bounded write-side. */
export interface VerifyMessageCopy {
  readonly title: string;
  readonly body: string;
  readonly buttonLabel: string;
}

/** The V1 community-manager-editable verify-message surface payload. */
export interface VerifyMessageConfig {
  readonly enabled: boolean;
  readonly copy: VerifyMessageCopy;
  /** Optional Jani Theme override; omit to inherit the world's default theme. */
  readonly theme?: Theme;
}

/** The known surfaces (config-protocol `Surface`). V1 = verify-message only. */
export type Surface = 'verify-message';

/** Map of surface -> its validated config shape. */
export interface SurfaceConfigMap {
  'verify-message': VerifyMessageConfig;
}

/**
 * The wire envelope keyed by (world_slug, surface), returned inside the
 * config-service GET body's `envelope` field (config-engine `ReadResult`).
 * Mirrors config-protocol `SurfaceConfig<Sf>`.
 */
export interface SurfaceConfig<Sf extends Surface = Surface> {
  readonly schema_version: '1.0';
  readonly world_slug: string;
  readonly surface: Sf;
  readonly config: SurfaceConfigMap[Sf];
}

export const SURFACE_CONFIG_SCHEMA_VERSION = '1.0' as const;
