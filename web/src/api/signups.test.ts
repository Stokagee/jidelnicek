import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelSignup, createSignup, updateSignup } from './signups'
import { ApiError } from './client'
import { makeSignup, mockFetch } from '../test/fixtures'

function lastCall(fetchMock: typeof fetch): [unknown, RequestInit] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    unknown,
    RequestInit,
  ]
}

describe('signup wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createSignup POSTs dish_id + day + portions (FR-S1)', async () => {
    const fetchMock = mockFetch([
      { method: 'POST', path: '/signups', status: 201, body: makeSignup({ id: 8, portions: 2 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const signup = await createSignup(5, '2026-01-06', 2)
    expect(signup.id).toBe(8)
    expect(JSON.parse(lastCall(fetchMock)[1].body as string)).toEqual({
      dish_id: 5,
      day: '2026-01-06',
      portions: 2,
    })
  })

  it('createSignup surfaces ApiError(422) when the day is outside the block (AC-1)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          method: 'POST',
          path: '/signups',
          status: 422,
          body: { detail: 'day must lie within the dish block' },
        },
      ]),
    )
    const err = (await createSignup(5, '2026-01-20', 1).catch((e) => e)) as ApiError
    expect(err.status).toBe(422)
    expect(err.message).toMatch(/block/)
  })

  it('updateSignup PATCHes the new portion count (FR-S4)', async () => {
    const fetchMock = mockFetch([
      { method: 'PATCH', path: '/signups/8', body: makeSignup({ id: 8, portions: 4 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    await updateSignup(8, 4)
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/signups\/8$/)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ portions: 4 })
  })

  it('cancelSignup DELETEs the signup (FR-S5, BR-7)', async () => {
    const fetchMock = mockFetch([{ method: 'DELETE', path: '/signups/8', body: { ok: true } }])
    vi.stubGlobal('fetch', fetchMock)
    await cancelSignup(8)
    expect(lastCall(fetchMock)[1].method).toBe('DELETE')
  })
})
