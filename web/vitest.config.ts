import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Unit/component test config, kept separate from vite.config.ts (the build).
// Time is pinned to Europe/Prague via the `test` npm scripts (cross-env TZ=...),
// not here, so worker threads inherit the zone at startup (BR-9).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
    },
  },
})
