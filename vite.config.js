import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:1234', // default fallback
        changeOrigin: true,
        secure: false,
        router: (req) => {
          return req.headers['x-proxy-target'] || 'http://localhost:1234';
        },
        rewrite: (path) => path.replace(/^\/api-proxy/, '')
      }
    }
  }
})
