// Proof-of-life for the vitest harness: jsdom, jest-dom matchers, the frozen
// Prague clock, and the mockFetch credentials guard. Mirrors the backend's
// tests/unit/test_smoke.py — it asserts the test base itself, no app code.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FROZEN_NOW_PRAGUE, makeMe, mockFetch } from './fixtures'

describe('frontend test infrastructure', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object')
    const el = document.createElement('div')
    el.textContent = 'ok'
    expect(el).toHaveTextContent('ok') // jest-dom matcher is wired
  })

  it('runs in Europe/Prague so date formatting is deterministic (BR-9)', () => {
    expect(process.env.TZ).toBe('Europe/Prague')
    // 2026-01-05 12:00 +01:00 → local hour is 12 in Prague (CET, winter).
    expect(FROZEN_NOW_PRAGUE.getHours()).toBe(12)
  })

  describe('frozen clock', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(FROZEN_NOW_PRAGUE)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('pins "now" to FROZEN_NOW_PRAGUE', () => {
      expect(new Date().toISOString()).toBe(FROZEN_NOW_PRAGUE.toISOString())
    })
  })

  describe('mockFetch', () => {
    it('serves matched routes and enforces credentials:include (FR-A5)', async () => {
      const fetchMock = mockFetch([{ path: '/me', body: makeMe({ is_admin: true }) }])
      const res = await fetchMock('http://localhost:8000/me', { credentials: 'include' })
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toMatchObject({ is_admin: true })
    })

    it('throws when credentials:include is missing (cookies-only rule)', async () => {
      const fetchMock = mockFetch([{ path: '/me', body: makeMe() }])
      await expect(fetchMock('http://localhost:8000/me')).rejects.toThrow(/credentials/)
    })

    it('404s an un-stubbed route so missing mocks are noticed', async () => {
      const fetchMock = mockFetch([{ path: '/me', body: makeMe() }])
      const res = await fetchMock('http://localhost:8000/weeks/current', { credentials: 'include' })
      expect(res.status).toBe(404)
    })
  })
})
