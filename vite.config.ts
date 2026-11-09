import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const base = process.env.BASE_PATH || '/Hiciarz/';
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icon.svg',
        'icon-*.png',
        'apple-touch-icon.png',
        'themes/*.svg',
        'themes/*.webp',
        'fonts/*',
      ],
      manifest: {
        name: 'Hiciarz — Twoja muzyka',
        short_name: 'Hiciarz',
        description:
          'Skanuj muzyczne karty, słuchaj i zgaduj hity. Twórz własne talie na wspólne wieczory.',
        id: base,
        start_url: base,
        scope: base,
        lang: 'pl',
        dir: 'ltr',
        categories: ['games', 'music', 'entertainment'],
        theme_color: '#083b34',
        background_color: '#f6f5f1',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ttf}'],
        maximumFileSizeToCacheInBytes: 4000000,
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
});
