/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

/** A build STAMP the player can read.
 *
 *  "Is the thing on my phone the thing I just deployed?" was unanswerable, and
 *  it cost a whole session of chasing bugs that had already been fixed on the
 *  server. CI supplies the commit; a local build says so. Never a guess again. */
const BUILD_ID = (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'dev';

// SPEC.md: base MUST be '/incrgame/' (project Pages subpath); manifest
// start_url/scope MUST equal it or the installed app boots to a 404.
export default defineConfig({
  base: '/incrgame/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      // icon-180 is referenced from index.html (apple-touch-icon), not the manifest
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Semantic Drift',
        short_name: 'Semantic Drift',
        description: 'Model all world knowledge. What could go wrong?',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/incrgame/',
        scope: '/incrgame/',
        background_color: '#0b0e14',
        theme_color: '#0b0e14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The ontology chunks are deliberately NOT precached — 8.6 MB would be a
        // rude install. They are cached the moment the game actually reads one,
        // so a domain you have played is a domain you can play offline.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ontology/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ontology-v1',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
