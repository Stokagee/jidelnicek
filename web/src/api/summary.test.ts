import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSummary } from './summary'
import { ApiError } from './client'
import { mockFetch } from '../test/fixtures'

describe('getSummary (FR-K)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /summary with the week and day and returns the rows', async () => {
    const fetchMock = mockFetch([
      { method: 'GET', path: '/summary', body: [{ dish_id: 5, name: 'Guláš', portions: 4 }] },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const rows = await getSummary(9, '2026-01-06')
    expect(rows).toEqual([{ dish_id: 5, name: 'Guláš', portions: 4 }])
    const url = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(String(url)).toContain('/summary?week=9&day=2026-01-06')
  })

  it('surfaces ApiError(403) for a non-admin caller', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ path: '/summary', status: 403, body: { detail: 'admin only' } }]),
    )
    const err = (await getSummary(9, '2026-01-06').catch((e) => e)) as ApiError
    expect(err.status).toBe(403)
  })
})
