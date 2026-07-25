/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// SPEC.md: base MUST be '/incrgame/' (project Pages subpath); manifest
// start_url/scope MUST equal it or the installed app boots to a 404.
export default defineConfig({
  base: '/incrgame/',
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
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
