/**
 * config-client.ts — the read seam against the (not-yet-deployed) config-service.
 *
 * The config SERVICE (`freeside-worlds/packages/config-service`, Bun.serve)
 * exposes `GET /v1/config/:world/:surface`. It is NOT deployed yet (bead
 * arrakis-e5jk / C-6). This module is built against the API CONTRACT (read
 * from config-service/src/app.ts + config-engine config-service.ts), so the
 * renderer has a typed read seam now and the live deploy is a separate concern.
 *
 * ── The GET contract (config-service app.ts + config-engine ReadResult) ───
 *   200 → { envelope: SurfaceConfig, version: number, updated_at: string }
 *   404 → { error: 'not_configured', world, surface }   (fail-soft: defaults)
 *   404 → { error: 'unknown_surface', surface, known }  (bad surface)
 *   401 → { error: 'unauthorized' }                     (missing service token)
 *
 * fail-SOFT read: a 404 (`not_configured`) is NOT an error — it means the CM
 * has never configured this surface, and the CALLER uses its own defaults
 * (config-engine getConfig returns null → app.ts returns 404 → here we return
 * `{ ok: false, reason: 'not_configured' }` and the caller renders defaults).
 */

import type { SurfaceConfig, Surface } from './config-types.js';

/** The 200 body shape of `GET /v1/config/:world/:surface`. */
export interface ConfigReadBody<Sf extends Surface = Surface> {
  envelope: SurfaceConfig<Sf>;
  version: number;
  updated_at: string;
}

/** Successful read. */
export interface ConfigReadOk<Sf extends Surface = Surface> {
  ok: true;
  envelope: SurfaceConfig<Sf>;
  version: number;
  updatedAt: string;
}

/** Fail-soft / error read — the caller decides whether to use defaults. */
export interface ConfigReadMiss {
  ok: false;
  /** `not_configured` (404 fail-soft) | `unauthorized` (401) | `error` (network/5xx) */
  reason: 'not_configured' | 'unknown_surface' | 'unauthorized' | 'error';
  status: number;
}

export type ConfigReadResult<Sf extends Surface = Surface> =
  | ConfigReadOk<Sf>
  | ConfigReadMiss;

export interface ConfigClientOptions {
  /** Base URL of the config-service, e.g. `https://config.<world>.internal`. */
  readonly baseUrl: string;
  /** Service token sent as the auth header (config-service `checkServiceToken`). */
  readonly serviceToken?: string;
  /** Injectable fetch (defaults to global fetch) — tests inject a mock here. */
  readonly fetch?: typeof fetch;
}

/**
 * Read a surface config from the config-service. fail-soft on 404. NEVER
 * throws on a non-2xx — returns a `ConfigReadMiss` the caller can branch on
 * (the renderer's whole posture is "render defaults when unconfigured").
 *
 * The auth header name mirrors config-service auth.ts `checkServiceToken`
 * (Bearer token). When the service ships C-2 real CM auth this stays the
 * machine-to-machine service token (the renderer is a backend caller).
 */
export async function readSurfaceConfig<Sf extends Surface>(
  world: string,
  surface: Sf,
  opts: ConfigClientOptions,
): Promise<ConfigReadResult<Sf>> {
  const doFetch = opts.fetch ?? fetch;
  const url = `${opts.baseUrl.replace(/\/$/, '')}/v1/config/${world}/${surface}`;
  const headers: Record<string, string> = {};
  if (opts.serviceToken) headers['authorization'] = `Bearer ${opts.serviceToken}`;

  let res: Response;
  try {
    res = await doFetch(url, { method: 'GET', headers });
  } catch {
    // network failure → fail-soft to defaults (operator-visibility primitive
    // posture: a slightly-stale / default answer beats no answer).
    return { ok: false, reason: 'error', status: 0 };
  }

  if (res.status === 200) {
    let body: ConfigReadBody<Sf>;
    try {
      body = (await res.json()) as ConfigReadBody<Sf>;
    } catch {
      // 200 with malformed / truncated JSON body → fail-soft, do NOT throw.
      // A bad body is no more recoverable than a network error from the
      // renderer's perspective; treat it identically so the caller renders
      // defaults instead of crashing the bot's send path.
      return { ok: false, reason: 'error', status: 200 };
    }
    return {
      ok: true,
      envelope: body.envelope,
      version: body.version,
      updatedAt: body.updated_at,
    };
  }
  if (res.status === 404) {
    // Disambiguate not_configured (fail-soft) vs unknown_surface.
    let reason: ConfigReadMiss['reason'] = 'not_configured';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error === 'unknown_surface') reason = 'unknown_surface';
    } catch {
      /* keep not_configured */
    }
    return { ok: false, reason, status: 404 };
  }
  if (res.status === 401) {
    return { ok: false, reason: 'unauthorized', status: 401 };
  }
  return { ok: false, reason: 'error', status: res.status };
}
