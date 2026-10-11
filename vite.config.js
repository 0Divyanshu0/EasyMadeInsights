import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic'
  })],
  server: {
    watch: {
      ignored: ["**/.venv/**", "**/.ocr/**", "**/test-results/**", "**/playwright-report/**", "**/__pycache__/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
})
