import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Make the bundled stylesheet non-render-blocking: load it as media="print" and
// flip to "all" once downloaded (loadCSS pattern). The inline #app-splash in
// index.html covers the brief unstyled window, so first paint no longer waits on
// the full CSS download. <noscript> keeps it working without JS.
function deferStylesheets() {
  return {
    name: 'mercasto-defer-stylesheets',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+rel="stylesheet"((?:(?!\bmedia=)[^>])*?)href="([^"]+)"((?:(?!\bmedia=)[^>])*?)>/g,
        (match, pre, href, post) =>
          `<link rel="stylesheet"${pre}href="${href}"${post} media="print" onload="this.media='all'">` +
          `<noscript><link rel="stylesheet"${pre}href="${href}"${post}></noscript>`
      );
    }
  };
}

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
    }),
    deferStylesheets()
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
