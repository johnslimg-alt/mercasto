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
      telemetry: false
    })
  ],
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    sourcemap: true,
  }
})
