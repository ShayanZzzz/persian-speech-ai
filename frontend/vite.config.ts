
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = 'http://127.0.0.1:8001'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': backend,
      '/register': backend,
      '/login': backend,
      '/me': backend,
      '/history': backend,
      '/transcribe': backend,
      '/api/v1': backend,
    },
  },
})
