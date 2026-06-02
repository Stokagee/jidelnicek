import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This config is evaluated by Node, where `process` exists; declare just the
// slice we read so we don't pull in @types/node only for the proxy target.
declare const process: { env: Record<string, string | undefined> }

// The app calls the API same-origin (client BASE_URL is '') and Vite proxies the
// API paths to the backend, so the httpOnly session cookie works without CORS —
// and it works for LAN/mobile clients too, since every request goes through :5173
// (an absolute API base URL would force cross-origin requests needing CORS and
// would break for any client where "localhost" isn't the API host).
// 127.0.0.1 (not localhost) avoids the Windows IPv6 ::1 stall. In docker-compose
// the api is a separate container, so the target is overridable via
// API_PROXY_TARGET (set to http://api:8000 there).
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000'
const proxyForApi = { target: apiTarget, changeOrigin: true }

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '^/me$': proxyForApi,
      '/auth': proxyForApi,
      '/weeks': proxyForApi,
      '/dishes': proxyForApi,
      '/signups': proxyForApi,
      '/summary': proxyForApi,
      '/settings': proxyForApi,
      '^/users$': proxyForApi,
      '/admin': proxyForApi,
      '/healthz': proxyForApi,
    },
  },
})
