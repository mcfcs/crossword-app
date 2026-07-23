import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
