/**
 * Test fixtures for the verify-message renderer.
 *
 * Shapes match freeside-worlds config-protocol `SurfaceConfig<'verify-message'>`
 * (the GET-body `envelope`). Values stay WITHIN the write-side bounds
 * config-protocol enforces (length caps, control-byte-free) — these are
 * "already validated by the service" inputs, since this renderer's job is the
 * ESCAPING half, not re-validation.
 */

import type { SurfaceConfig, Theme } from '../../src/config-types.js';

/** A clean, minimal verify-message config (no theme override → default accent). */
export const CLEAN_VERIFY_CONFIG: SurfaceConfig<'verify-message'> = {
  schema_version: '1.0',
  world_slug: 'mibera',
  surface: 'verify-message',
  config: {
    enabled: true,
    copy: {
      title: 'Verify your wallet',
      body: 'Link your wallet to unlock community roles and the Mibera channels.',
      buttonLabel: 'Verify now',
    },
  },
};

/** A config whose CM copy contains Discord markdown + mention injection attempts. */
export const MALICIOUS_COPY_CONFIG: SurfaceConfig<'verify-message'> = {
  schema_version: '1.0',
  world_slug: 'mibera',
  surface: 'verify-message',
  config: {
    enabled: true,
    copy: {
      // markdown injection + a smuggled heading sigil
      title: '## **Owner** _verify_',
      // mass-ping + masked link + spoiler + role mention
      body: 'hey @everyone click ||free roles|| [here](https://evil.example) <@&123456789012345678>',
      // markdown in the button label
      buttonLabel: '__Click__ *me*',
    },
  },
};

/** A config carrying a Theme override with a verify page layout. */
const THEMED: Theme = {
  id: 'theme-mibera-verify',
  name: 'Mibera Verify',
  branding: {
    colors: {
      primary: '#6f4ea1',
      secondary: '#9b6a3f',
      accent: '#c9a44c',
      background: '#101014',
      surface: '#1a1a20',
      text: '#f5f5f7',
    },
    fonts: {
      heading: { family: 'Inter', weight: 700 },
      body: { family: 'Inter', weight: 400 },
    },
    borderRadius: 'md',
    spacing: 'comfortable',
  },
  pages: [
    {
      id: 'page-verify',
      name: 'Verify Page',
      slug: 'verify',
      components: [
        {
          id: 'rt-1',
          type: 'rich-text',
          props: { content: 'Welcome to **Mibera**. Connect below to begin.' },
        },
        {
          id: 'div-1',
          type: 'divider',
          props: {},
        },
        {
          id: 'lc-1',
          type: 'layout-container',
          props: { direction: 'vertical', gap: 'md', padding: 'md' },
          children: [
            {
              id: 'rt-nested',
              type: 'rich-text',
              props: { content: 'Roles unlock _instantly_ after you verify.' },
            },
            {
              id: 'gallery-skip',
              type: 'nft-gallery',
              props: { contractId: 'mibera-vm', columns: 3, layout: 'grid' },
            },
          ],
        },
      ],
    },
  ],
  createdAt: '2026-05-31T00:00:00Z',
  updatedAt: '2026-05-31T00:00:00Z',
};

export const THEMED_VERIFY_CONFIG: SurfaceConfig<'verify-message'> = {
  schema_version: '1.0',
  world_slug: 'mibera',
  surface: 'verify-message',
  config: {
    enabled: true,
    copy: {
      title: 'Verify your wallet',
      body: 'Link your wallet to continue.',
      buttonLabel: 'Verify',
    },
    theme: THEMED,
  },
};

/** A disabled verify-message config. */
export const DISABLED_VERIFY_CONFIG: SurfaceConfig<'verify-message'> = {
  ...CLEAN_VERIFY_CONFIG,
  config: { ...CLEAN_VERIFY_CONFIG.config, enabled: false },
};

export const VERIFY_URL = 'https://verify.mibera.xyz/?state=abc123';
