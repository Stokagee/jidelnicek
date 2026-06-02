import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings, setOpenChoosing } from './settings'
import { mockFetch } from '../test/fixtures'

function lastCall(fetchMock: typeof fetch): [unknown, RequestInit] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    unknown,
    RequestInit,
  ]
}

describe('settings wrappers (#77)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getSettings GETs /settings', async () => {
    vi.stubGlobal('fetch', mockFetch([{ path: '/settings', body: { open_choosing: true } }]))
    expect(await getSettings()).toEqual({ open_choosing: true })
  })

  it('setOpenChoosing PUTs the new value to /settings', async () => {
    const fetchMock = mockFetch([
      { method: 'PUT', path: '/settings', body: { open_choosing: true } },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const result = await setOpenChoosing(true)
    expect(result.open_choosing).toBe(true)
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/settings$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ open_choosing: true })
  })
})
