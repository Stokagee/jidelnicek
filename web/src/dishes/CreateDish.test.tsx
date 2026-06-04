import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { FROZEN_NOW_PRAGUE, makeDish, makeMe, makeWeek, mockFetch } from '../test/fixtures'

// #80: Create-dish plans within [today, today+30], anchored on Europe/Prague —
// freeze "today" to the shared reference Monday 2026-01-05 so the window is fixed.
describe('CreateDish (FR-D1, FR-D2 · #80 plan up to 30 days ahead)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FROZEN_NOW_PRAGUE)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('plans a dish by date (no week_id) and returns home on success (#80)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 7 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })

    await userEvent.type(await screen.findByTestId('dish-name'), 'Svíčková')
    await userEvent.click(screen.getByTestId('pick-day-2026-01-20'))
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    const post = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    const body = JSON.parse((post![1] as RequestInit).body as string)
    expect(body).toEqual({ name: 'Svíčková', start_date: '2026-01-20', end_date: '2026-01-20' })
    expect(body).not.toHaveProperty('week_id')
  })

  it('pre-selects the day passed via ?date= (#1 — no second confirmation)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new?date=2026-01-15' })
    expect(await screen.findByTestId('pick-day-2026-01-15')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('centres the block picker on the selected day: 3 days back and forward (#2)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new?date=2026-01-15' })
    await screen.findByTestId('dish-name')
    // The block picker (a 7-day grid) is centred on the 15th: 12.–18.
    const block = screen.getByRole('group', { name: cs.dish.blockPickerLabel })
    expect(within(block).getByText('12')).toBeInTheDocument()
    expect(within(block).getByText('18')).toBeInTheDocument()
    expect(within(block).getByRole('button', { name: '15' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('blocks submit with a name-required error when the name is empty (#79)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 7 }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    await userEvent.click(await screen.findByTestId('pick-day-2026-01-20'))
    await userEvent.click(screen.getByTestId('dish-submit'))

    expect(await screen.findByTestId('dish-error')).toHaveTextContent(cs.dish.nameRequired)
    const posted = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(posted).toBe(false)
  })

  it('lets any member reach the form when open choosing is on (#77)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3, start_date: '2026-01-05' }) },
        { path: '/settings', body: { open_choosing: true } },
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
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/new' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('dish-name')).not.toBeInTheDocument()
  })
})
