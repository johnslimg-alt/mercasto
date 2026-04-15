import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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