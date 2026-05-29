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

    expect(await screen.findByTestId('home')).toBeInTheDocument()
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

  it('redirects a non-chooser member away from the create route (AC-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    expect(await screen.findByTestId('home')).toBeInTheDocument()
    expect(screen.queryByTestId('dish-name')).not.toBeInTheDocument()
  })
})
