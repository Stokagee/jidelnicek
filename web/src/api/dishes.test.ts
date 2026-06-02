import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDish, createOpenDish, deleteDish, getDishes, updateDish } from './dishes'
import { ApiError } from './client'
import { makeDish, mockFetch } from '../test/fixtures'

function lastCall(fetchMock: typeof fetch): [unknown, RequestInit] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [
    unknown,
    RequestInit,
  ]
}

describe('dish wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createDish POSTs week_id + name + block to /dishes (FR-D1)', async () => {
    const fetchMock = mockFetch([
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 5, name: 'Guláš' }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const dish = await createDish(9, {
      name: 'Guláš',
      start_date: '2026-01-05',
      end_date: '2026-01-07',
    })
    expect(dish.id).toBe(5)
    expect(JSON.parse(lastCall(fetchMock)[1].body as string)).toEqual({
      week_id: 9,
      name: 'Guláš',
      start_date: '2026-01-05',
      end_date: '2026-01-07',
    })
  })

  it('createDish surfaces ApiError(403) for a non-admin, non-chooser caller (AC-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ method: 'POST', path: '/dishes', status: 403, body: { detail: 'no' } }]),
    )
    const err = (await createDish(9, {
      name: 'X',
      start_date: '2026-01-05',
      end_date: '2026-01-07',
    }).catch((e) => e)) as ApiError
    expect(err.status).toBe(403)
  })

  it('createDish surfaces ApiError(422) with the server message when the block is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        {
          method: 'POST',
          path: '/dishes',
          status: 422,
          body: { detail: 'end_date must not precede start_date' },
        },
      ]),
    )
    const err = (await createDish(9, {
      name: 'X',
      start_date: '2026-01-07',
      end_date: '2026-01-05',
    }).catch((e) => e)) as ApiError
    expect(err.status).toBe(422)
    expect(err.message).toMatch(/precede/)
  })

  it('updateDish PATCHes the changed fields to /dishes/{id} (FR-D5)', async () => {
    const fetchMock = mockFetch([
      { method: 'PATCH', path: '/dishes/5', body: makeDish({ id: 5, name: 'Rajská' }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    await updateDish(5, { name: 'Rajská' })
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/dishes\/5$/)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Rajská' })
  })

  it('deleteDish DELETEs /dishes/{id} (soft-delete, BR-7)', async () => {
    const fetchMock = mockFetch([{ method: 'DELETE', path: '/dishes/5', body: { ok: true } }])
    vi.stubGlobal('fetch', fetchMock)
    await deleteDish(5)
    const [url, init] = lastCall(fetchMock)
    expect(String(url)).toMatch(/\/dishes\/5$/)
    expect(init.method).toBe('DELETE')
  })

  it('createOpenDish POSTs a (day, slot) dish without a week_id (#77/#80)', async () => {
    const fetchMock = mockFetch([
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 7, slot: 'dinner' }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    const dish = await createOpenDish({
      name: 'Čočka',
      start_date: '2026-01-19',
      end_date: '2026-01-19',
      slot: 'dinner',
    })
    expect(dish.id).toBe(7)
    const body = JSON.parse(lastCall(fetchMock)[1].body as string)
    expect(body).toEqual({
      name: 'Čočka',
      start_date: '2026-01-19',
      end_date: '2026-01-19',
      slot: 'dinner',
    })
    expect(body).not.toHaveProperty('week_id')
  })

  it('createOpenDish surfaces ApiError(409) when the slot is taken that day (#77)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ method: 'POST', path: '/dishes', status: 409, body: { detail: 'taken' } }]),
    )
    const err = (await createOpenDish({
      name: 'X',
      start_date: '2026-01-19',
      end_date: '2026-01-19',
      slot: 'lunch',
    }).catch((e) => e)) as ApiError
    expect(err.status).toBe(409)
  })

  it('getDishes GETs /dishes with a start/end query (#80)', async () => {
    const fetchMock = mockFetch([{ method: 'GET', path: '/dishes', body: [makeDish({ id: 5 })] }])
    vi.stubGlobal('fetch', fetchMock)
    const dishes = await getDishes('2026-01-05', '2026-02-03')
    expect(dishes).toHaveLength(1)
    const [url, init] = lastCall(fetchMock)
    expect(init.method ?? 'GET').toBe('GET')
    expect(String(url)).toContain('start=2026-01-05')
    expect(String(url)).toContain('end=2026-02-03')
  })
})
