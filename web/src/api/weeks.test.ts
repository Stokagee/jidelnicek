import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentWeek, setChooser } from './weeks'
import { ApiError } from './client'
import { makeWeek, mockFetch } from '../test/fixtures'

function lastCall(fetchMock: typeof fetch): [unknown, RequestInit] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    unknown,
    RequestInit,
  ]
}

describe('week wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getCurrentWeek GETs /weeks/current and returns the week (FR-W1)', async () => {
    const fetchMock = mockFetch([
      { method: 'GET', path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const week = await getCurrentWeek()
    expect(week.id).toBe(9)
    expect(week.chooser_id).toBe(3)
    expect(String(lastCall(fetchMock)[0])).toMatch(/\/weeks\/current$/)
  })

  it('setChooser PUTs the chooser_id to /weeks/{id}/chooser (FR-W2)', async () => {
    const fetchMock = mockFetch([
      { method: 'PUT', path: '/weeks/9/chooser', body: makeWeek({ id: 9, chooser_id: 4 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const week = await setChooser(9, 4)
    expect(week.chooser_id).toBe(4)
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/weeks\/9\/chooser$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toMatchObject({ chooser_id: 4 })
  })

  it('setChooser surfaces ApiError(403) for a non-admin caller', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ method: 'PUT', path: '/weeks/9/chooser', status: 403, body: { detail: 'no' } }]),
    )
    const err = (await setChooser(9, 4).catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
  })
})
