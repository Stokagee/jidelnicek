// Global test setup: jest-dom matchers, RTL cleanup, and a hard guard that the
// process runs in Europe/Prague (BR-9) so Intl / toLocale* date formatting is
// deterministic on any machine. The zone is set by the `test` scripts via
// cross-env (TZ must be present before Node starts to be reliable on Windows).
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

if (process.env.TZ !== 'Europe/Prague') {
  throw new Error(
    `Tests must run with TZ=Europe/Prague (BR-9); got ${process.env.TZ ?? '(unset)'}. ` +
      'Run via the `test` / `test:watch` / `test:cov` npm scripts.',
  )
}

afterEach(() => {
  cleanup()
})
