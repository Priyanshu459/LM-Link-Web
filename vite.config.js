import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

// ── Security: Only permit proxy forwarding to localhost/loopback addresses.
//              Restricts the x-proxy-target header to prevent SSRF in dev mode.
const ALLOWED_PROXY_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const isSafeProxyTarget = (target) => {
  try {
    const url = new URL(target);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ALLOWED_PROXY_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
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
  }), cloudflare()],
  server: {
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:1234', // default fallback
        changeOrigin: true,
        secure: false,
        router: (req) => {
          const requested = req.headers['x-proxy-target'];
          // ── Security: Only forward to safe localhost targets ──────────────
          if (requested && isSafeProxyTarget(requested)) {
            return requested;
          }
          return 'http://localhost:1234';
        },
        rewrite: (path) => path.replace(/^\/api-proxy/, '')
      }
    }
  }
})