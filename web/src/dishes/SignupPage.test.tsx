import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, makeSignup, makeWeek, mockFetch } from '../test/fixtures'

const weekWithDish = () =>
  makeWeek({
    id: 9,
    start_date: '2026-01-05',
    dishes: [makeDish({ id: 5, name: 'Guláš', start_date: '2026-01-05', end_date: '2026-01-07' })],
  })

describe('SignupPage (FR-S1/FR-S2, AC-1/AC-2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('only offers days inside the dish block (AC-1)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2 }) },
        { path: '/weeks/current', body: weekWithDish() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/signup' })
    expect(await screen.findByTestId('day-2026-01-05')).toBeInTheDocument()
    expect(screen.getByTestId('day-2026-01-07')).toBeInTheDocument()
    // A day outside the block is never rendered, so it cannot be picked.
    expect(screen.queryByTestId('day-2026-01-08')).not.toBeInTheDocument()
    expect(screen.queryByTestId('day-2026-01-04')).not.toBeInTheDocument()
  })

  it('signs up for a chosen day and then allows cancelling (FR-S1/FR-S5, AC-6)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2 }) },
        { path: '/weeks/current', body: weekWithDish() },
        { method: 'POST', path: '/signups', status: 201, body: makeSignup({ id: 8 }) },
        { method: 'DELETE', path: '/signups/8', body: { ok: true } },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/signup' })
    await userEvent.click(await screen.findByTestId('day-2026-01-06'))
    await userEvent.click(screen.getByTestId('signup-submit'))
    expect(await screen.findByTestId('signup-confirmed')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('signup-cancel'))
    await vi.waitFor(() => expect(screen.queryByTestId('signup-confirmed')).not.toBeInTheDocument())
  })

  it('blocks submit client-side when portions < 1 (AC-2)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 2 }) },
      { path: '/weeks/current', body: weekWithDish() },
      { method: 'POST', path: '/signups', status: 201, body: makeSignup({ id: 8 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/signup' })
    await userEvent.click(await screen.findByTestId('day-2026-01-06'))
    fireEvent.change(screen.getByTestId('signup-portions'), { target: { value: '0' } })
    await userEvent.click(screen.getByTestId('signup-submit'))

    expect(await screen.findByTestId('signup-error')).toHaveTextContent(cs.signup.invalidPortions)
    const posted = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(posted).toBe(false)
  })

  it('asks for a day when none is selected', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2 }) },
        { path: '/weeks/current', body: weekWithDish() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/signup' })
    await userEvent.click(await screen.findByTestId('signup-submit'))
    expect(await screen.findByTestId('signup-error')).toHaveTextContent(cs.signup.noDay)
  })
})
