import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, makeWeek, mockFetch } from '../test/fixtures'

describe('CreateDish (FR-D1, FR-D2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lets the admin create a dish and returns to the home on success', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
        { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 5 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    await userEvent.type(await screen.findByTestId('dish-name'), 'Svíčková')
    fireEvent.change(screen.getByTestId('dish-start-date'), { target: { value: '2026-01-05' } })
    fireEvent.change(screen.getByTestId('dish-end-date'), { target: { value: '2026-01-07' } })
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
  })

  it('plans a dish by date (no week_id) when a ?date is given (#80)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 7 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/new?date=2026-01-20' })
    await userEvent.type(await screen.findByTestId('dish-name'), 'Svíčková')
    fireEvent.change(screen.getByTestId('dish-start-date'), { target: { value: '2026-01-20' } })
    fireEvent.change(screen.getByTestId('dish-end-date'), { target: { value: '2026-01-20' } })
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    const post = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(post).toBeDefined()
    const body = JSON.parse((post![1] as RequestInit).body as string)
    expect(body).toEqual({ name: 'Svíčková', start_date: '2026-01-20', end_date: '2026-01-20' })
    expect(body).not.toHaveProperty('week_id')
  })

  it('blocks submit and shows a client error when the block end precedes its start (FR-D1)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 5 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    await userEvent.type(await screen.findByTestId('dish-name'), 'Guláš')
    fireEvent.change(screen.getByTestId('dish-start-date'), { target: { value: '2026-01-08' } })
    fireEvent.change(screen.getByTestId('dish-end-date'), { target: { value: '2026-01-06' } })
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('dish-error')).toHaveTextContent(cs.dish.invalidBlock)
    // No POST should have been attempted.
    const posted = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(posted).toBe(false)
  })

  it('blocks submit and shows a name-required error when the name is empty (#79)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 5 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    // Pick a valid block but leave the name empty: the user must see a name error,
    // not the misleading "block end before start" message (#79).
    fireEvent.change(await screen.findByTestId('dish-start-date'), {
      target: { value: '2026-01-05' },
    })
    fireEvent.change(screen.getByTestId('dish-end-date'), { target: { value: '2026-01-07' } })
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('dish-error')).toHaveTextContent(cs.dish.nameRequired)
    // No POST should have been attempted.
    const posted = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(posted).toBe(false)
  })

  it('lets any member reach the create form when open choosing is on (#77)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3, start_date: '2026-01-05' }) },
        { path: '/settings', body: { open_choosing: true } },
        { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 5 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    expect(await screen.findByTestId('dish-name')).toBeInTheDocument()
  })

  it('redirects a non-chooser member away from the create route (AC-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('dish-name')).not.toBeInTheDocument()
  })
})
