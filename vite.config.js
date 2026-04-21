import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl()
  ],
  build: {
    // Объединяем CSS в один файл для чистоты папки assets
    cssCodeSplit: false,
    // Очищаем папку dist перед каждой новой сборкой
    emptyOutDir: true,
    // Настройки для стабильной работы сборщика на macOS
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})