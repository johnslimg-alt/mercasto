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
    cssCodeSplit: false,
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('/@sentry/') || id.includes('/laravel-echo/') || id.includes('/pusher-js/')) {
            return 'vendor-observability';
          }
          if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory/')) {
            return 'vendor-charts';
          }
          if (id.includes('/leaflet/') || id.includes('/leaflet.markercluster/')) {
            return 'vendor-maps';
          }
          if (id.includes('/@headlessui/') || id.includes('/heroicons/') || id.includes('/lucide-react/')) {
            return 'vendor-ui';
          }
          return null;
        },
      },
    },
  }
})
