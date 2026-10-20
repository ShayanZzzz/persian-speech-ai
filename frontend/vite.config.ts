import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': backend,
      '/register': backend,
      '/login': {
        target: backend,
        changeOrigin: true,
        bypass: (req) => req.method === 'GET' ? req.url : undefined,
      },
      '/me': backend,
      '/history': backend,
      '/transcribe': backend,
      '/api/v1': backend,
    },
  },
})
