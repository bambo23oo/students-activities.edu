import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        manifest: {
          name: 'NPU Activity Tracker',
          short_name: 'NPU Tracker',
          theme_color: '#1e3a8a',
          icons: [
            { src: 'https://cdn-icons-png.flaticon.com/512/1904/1904425.png', sizes: '192x192', type: 'image/png' },
            { src: 'https://cdn-icons-png.flaticon.com/512/1904/1904425.png', sizes: '512x512', type: 'image/png' }
          ]
        },
        workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, 
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ts,tsx}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
