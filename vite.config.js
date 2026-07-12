import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LM Link Web',
        short_name: 'LM Link',
        description: 'A beautifully designed interface for local AI models via LM Studio',
        theme_color: '#0f0f13',
        background_color: '#0f0f13',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
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
