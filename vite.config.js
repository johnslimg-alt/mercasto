import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: "mercasto",
      project: "frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      disable: !process.env.SENTRY_AUTH_TOKEN
    })
  ],
  build: {
    cssCodeSplit: true,
    emptyOutDir: true,
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;
          
          // React core
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react';
          }
          
          // Maps (Leaflet is heavy)
          if (
            id.includes('/leaflet/')
            || id.includes('/leaflet-draw/')
            || id.includes('/leaflet.markercluster/')
            || id.includes('/react-leaflet/')
          ) {
            return null;
          }
          
          // Observability
          if (id.includes('/@sentry/') || id.includes('/laravel-echo/') || id.includes('/pusher-js/')) {
            return 'vendor-observability';
          }
          
          // UI / Tailwind related
          if (id.includes('/@headlessui/') || id.includes('/@heroicons/') || id.includes('/framer-motion/')) {
            return 'vendor-ui';
          }
          
          // All other node_modules
          return 'vendor-misc';
        },
      },
    },
  }
})
