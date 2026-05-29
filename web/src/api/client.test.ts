import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'
import { makeMe, mockFetch } from '../test/fixtures'

// apiFetch is the single seam every call goes through; these lock its contract
// (FR-A5 cookies-only, typed errors) so screens can rely on it.
describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('always sends credentials:include so the session cookie travels (FR-A5)', async () => {
    // mockFetch throws if credentials !== 'include'; a resolved call proves it.
    vi.stubGlobal('fetch', mockFetch([{ path: '/me', body: makeMe() }]))
    await expect(apiFetch('/me')).resolves.toBeDefined()
  })

  it('prefixes the configured base URL and parses the JSON body', async () => {
    const fetchMock = mockFetch([{ method: 'GET', path: '/me', body: makeMe({ is_admin: true }) }])
    vi.stubGlobal('fetch', fetchMock)
    const me = await apiFetch<{ is_admin: boolean }>('/me')
    expect(me.is_admin).toBe(true)
    const calledUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(String(calledUrl)).toMatch(/\/me$/)
  })

  it('JSON-encodes the request body with a json content-type', async () => {
    const fetchMock = mockFetch([{ method: 'POST', path: '/auth/login', body: makeMe() }])
    vi.stubGlobal('fetch', fetchMock)
    await apiFetch('/auth/login', { method: 'POST', json: { name: 'alice', password: 'pw' } })
    const init = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ name: 'alice', password: 'pw' }))
  })

  it('throws a typed ApiError flagged isUnauthorized on 401 (drives /login redirect)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ path: '/me', status: 401, body: { detail: 'Not authenticated' } }]),
    )
    const err = await apiFetch('/me').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.isUnauthorized).toBe(true)
  })

  it('surfaces the parsed error body on 422 so BR-2/BR-4 messages reach the UI', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ method: 'POST', path: '/signups', status: 422, body: { detail: 'bad day' } }]),
    )
    const err = (await apiFetch('/signups', { method: 'POST', json: {} }).catch(
      (e) => e,
    )) as ApiError
    expect(err.status).toBe(422)
    expect(err.body).toMatchObject({ detail: 'bad day' })
    expect(err.message).toBe('bad day')
  })

  it('tolerates an empty (204) body', async () => {
    vi.stubGlobal('fetch', mockFetch([{ method: 'POST', path: '/auth/logout', status: 204 }]))
    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
