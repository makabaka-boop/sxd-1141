import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8846,
    proxy: {
      '/api': {
        target: 'http://localhost:8115',
        changeOrigin: true,
      },
    },
  },
})
