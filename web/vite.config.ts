import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const base = process.env.BASE_PATH || '/Hiciarz/';
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, '**/._*'] },
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
        name: 'Hiciarz',
        short_name: 'Hiciarz',
        description: 'Gra muzyczna z własnych kart. Skanowanie, talie i druk PDF.',
        id: base,
        start_url: base,
        scope: base,
        lang: 'pl',
        dir: 'ltr',
        categories: ['games', 'music', 'entertainment'],
        theme_color: '#083b34',
        background_color: '#f6f5f1',
        display: 'standalone',
        shortcuts: [
          {
            name: 'Skanuj karty',
            url: `${base}?view=scanner`,
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Twórz karty',
            url: `${base}?view=editor`,
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ttf,json}'],
        maximumFileSizeToCacheInBytes: 4000000,
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
});
