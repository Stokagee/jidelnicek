import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev the app calls the API same-origin (client BASE_URL is '') and Vite
// proxies the API paths to the backend, so the httpOnly session cookie works
// without CORS. 127.0.0.1 (not localhost) avoids the Windows IPv6 ::1 stall.
const apiTarget = 'http://127.0.0.1:8000'
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
      '^/users$': proxyForApi,
      '/admin': proxyForApi,
      '/healthz': proxyForApi,
    },
  },
})
