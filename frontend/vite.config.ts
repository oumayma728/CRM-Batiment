import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // ── SSE streaming endpoint — needs a very long timeout and no buffering ──
      '/api/assistant/admin/rag/stream': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No timeout for streaming (0 = disabled)
        proxyTimeout: 0,
        timeout: 0,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[Vite proxy SSE] error:', err.message);
            try {
              // Only write error response if headers haven't been sent yet
              // (SSE connections send headers immediately, so headersSent will be true)
              if ('headersSent' in res && !res.headersSent) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Stream unavailable', statusCode: 503 }));
              }
            } catch {
              // Swallow — headers already sent for SSE connections
            }
          });
        },
      },
      // ── All other API routes ───────────────────────────────────────────────
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        proxyTimeout: 30000,
        timeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[Vite proxy] Backend not ready yet:', err.message);
            try {
              if ('headersSent' in res && !res.headersSent) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Backend not ready. Please wait…', statusCode: 503 }));
              }
            } catch {
              // Swallow — cannot write response after headers sent
            }
          });
        },
      },
    },
  },
})

