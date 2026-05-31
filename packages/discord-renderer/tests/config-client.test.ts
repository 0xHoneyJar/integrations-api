/**
 * config-client tests — the read seam against the (not-yet-deployed)
 * config-service (bead arrakis-e5jk / C-6). Mocks the service against its
 * DOCUMENTED GET contract (config-service app.ts + config-engine ReadResult):
 *
 *   200 → { envelope, version, updated_at }
 *   404 → { error: 'not_configured' | 'unknown_surface' }   (fail-soft)
 *   401 → { error: 'unauthorized' }
 *
 * The service is NOT live; these tests bind the contract so the renderer's
 * read path is exercised now and the live deploy is a separate concern.
 */

import { describe, it, expect } from 'bun:test';
import { readSurfaceConfig } from '../src/index.js';
import { CLEAN_VERIFY_CONFIG } from './fixtures/verify-fixtures.js';

/** Build a mock fetch that returns a fixed Response for any request. */
function mockFetch(status: number, body: unknown, capture?: (url: string, init?: RequestInit) => void) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    capture?.(String(url), init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('readSurfaceConfig — mocked config-service GET contract', () => {
  it('200 → ok with envelope/version/updatedAt', async () => {
    const fetchMock = mockFetch(200, {
      envelope: CLEAN_VERIFY_CONFIG,
      version: 3,
      updated_at: '2026-05-31T12:00:00Z',
    });
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      serviceToken: 'svc-token',
      fetch: fetchMock,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.envelope.world_slug).toBe('mibera');
      expect(res.envelope.config.copy.title).toBe('Verify your wallet');
      expect(res.version).toBe(3);
      expect(res.updatedAt).toBe('2026-05-31T12:00:00Z');
    }
  });

  it('builds the documented route + bearer auth header', async () => {
    let seenUrl = '';
    let seenAuth: string | null = null;
    const fetchMock = mockFetch(
      200,
      { envelope: CLEAN_VERIFY_CONFIG, version: 1, updated_at: 'now' },
      (url, init) => {
        seenUrl = url;
        const h = new Headers(init?.headers);
        seenAuth = h.get('authorization');
      },
    );
    await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal/',
      serviceToken: 'svc-token',
      fetch: fetchMock,
    });
    expect(seenUrl).toBe('https://config.internal/v1/config/mibera/verify-message');
    expect(seenAuth).toBe('Bearer svc-token');
  });

  it('404 not_configured → fail-soft miss (caller uses defaults)', async () => {
    const fetchMock = mockFetch(404, { error: 'not_configured', world: 'mibera', surface: 'verify-message' });
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: fetchMock,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('not_configured');
      expect(res.status).toBe(404);
    }
  });

  it('404 unknown_surface → distinguished miss', async () => {
    const fetchMock = mockFetch(404, { error: 'unknown_surface', surface: 'nope', known: ['verify-message'] });
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: fetchMock,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unknown_surface');
  });

  it('401 → unauthorized miss', async () => {
    const fetchMock = mockFetch(401, { error: 'unauthorized' });
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: fetchMock,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unauthorized');
  });

  it('network failure → fail-soft error miss, never throws', async () => {
    const throwingFetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: throwingFetch,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('error');
      expect(res.status).toBe(0);
    }
  });

  it('5xx → error miss', async () => {
    const fetchMock = mockFetch(503, { error: 'unavailable' });
    const res = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: fetchMock,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('error');
      expect(res.status).toBe(503);
    }
  });
});

/**
 * Integration sketch: read (mocked) → render. Proves the end-to-end path the
 * bot will run: GET the config, fall back to defaults on 404, render to CV2.
 */
describe('config-client + renderer — read-then-render integration', () => {
  it('200 read flows into a rendered verify message', async () => {
    const fetchMock = mockFetch(200, {
      envelope: CLEAN_VERIFY_CONFIG,
      version: 1,
      updated_at: 'now',
    });
    const read = await readSurfaceConfig('mibera', 'verify-message', {
      baseUrl: 'https://config.internal',
      fetch: fetchMock,
    });
    expect(read.ok).toBe(true);
    if (read.ok) {
      const { renderVerifyMessageToDiscord } = await import('../src/index.js');
      const out = renderVerifyMessageToDiscord({
        surfaceConfig: read.envelope,
        verifyUrl: 'https://verify.mibera.xyz/?state=xyz',
      });
      expect(out.components.length).toBe(1);
      expect(out.flags).toBe(1 << 15);
    }
  });
});
