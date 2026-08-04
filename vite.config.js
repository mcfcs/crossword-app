import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only: run the Vercel `api/cwf/*` serverless handlers inside the Vite dev
// server so the Browse tab works under `npm run dev` (not just `vercel dev`).
// In production Vercel runs these same files as real functions.
function cwfDevApi() {
  return {
    name: 'cwf-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/cwf/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.split('/')[3] // /api/cwf/<name>
        let handler
        try {
          if (name === 'search') handler = (await server.ssrLoadModule('/api/cwf/search.js')).default
          else if (name === 'puzzle') handler = (await server.ssrLoadModule('/api/cwf/puzzle.js')).default
          else return next()
        } catch (err) {
          res.statusCode = 500
          return res.end(JSON.stringify({ error: 'load_failed', message: String(err.message || err) }))
        }
        // Adapt Node req/res to the Vercel handler interface.
        req.query = Object.fromEntries(url.searchParams)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res }
        try {
          await handler(req, res)
        } catch (err) {
          if (!res.writableEnded) { res.statusCode = 500; res.end(JSON.stringify({ error: 'handler_error', message: String(err.message || err) })) }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cwfDevApi()],
  server: {
    port: 7891,
    strictPort: true,
    host: true, // expose on LAN / Tailscale so a phone can reach it
    // Personal app on a private tailnet: allow any host (Tailscale IP or
    // MagicDNS name) so Vite never answers "Blocked request ... is not allowed".
    allowedHosts: true,
  },
  preview: {
    port: 7891,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
})
