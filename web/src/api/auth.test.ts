import { afterEach, describe, expect, it, vi } from 'vitest'
import { claim, getMe, login, logout } from './auth'
import { ApiError } from './client'
import { makeMe, mockFetch } from '../test/fixtures'

function lastCall(fetchMock: typeof fetch): [unknown, RequestInit] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    unknown,
    RequestInit,
  ]
}

describe('auth wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('claim POSTs token+name+password and returns the identity (FR-A3)', async () => {
    const fetchMock = mockFetch([{ method: 'POST', path: '/auth/claim', body: makeMe({ id: 7 }) }])
    vi.stubGlobal('fetch', fetchMock)
    const me = await claim('tok-123', 'alice', 'secret')
    expect(me.id).toBe(7)
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/auth\/claim$/)
    expect(JSON.parse(init.body as string)).toEqual({
      token: 'tok-123',
      name: 'alice',
      password: 'secret',
    })
  })

  it('login POSTs name+password and returns the identity (FR-A4)', async () => {
    const fetchMock = mockFetch([
      { method: 'POST', path: '/auth/login', body: makeMe({ is_admin: true }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const me = await login('cook', 'pw')
    expect(me.is_admin).toBe(true)
    expect(JSON.parse(lastCall(fetchMock)[1].body as string)).toEqual({
      name: 'cook',
      password: 'pw',
    })
  })

  it('login surfaces ApiError(401) on bad credentials (FR-A4)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ method: 'POST', path: '/auth/login', status: 401, body: { detail: 'no' } }]),
    )
    const err = (await login('x', 'y').catch((e) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.isUnauthorized).toBe(true)
  })

  it('getMe GETs /me (FR-A6)', async () => {
    const fetchMock = mockFetch([{ method: 'GET', path: '/me', body: makeMe() }])
    vi.stubGlobal('fetch', fetchMock)
    await getMe()
    expect(lastCall(fetchMock)[1].method).toBe('GET')
    expect(String(lastCall(fetchMock)[0])).toMatch(/\/me$/)
  })

  it('logout POSTs /auth/logout', async () => {
    const fetchMock = mockFetch([{ method: 'POST', path: '/auth/logout', status: 204 }])
    vi.stubGlobal('fetch', fetchMock)
    await expect(logout()).resolves.toBeUndefined()
    expect(lastCall(fetchMock)[1].method).toBe('POST')
  })
})
