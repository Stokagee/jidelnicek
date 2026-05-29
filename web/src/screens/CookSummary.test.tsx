import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeMe, makeWeek, mockFetch } from '../test/fixtures'

describe('CookSummary (§14.5, AC-4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows per-dish portion totals for the selected day (AC-4)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
        // /summary sums all active signups including the admin's own (server-side).
        { path: '/summary', body: [{ dish_id: 5, name: 'Svíčková', portions: 7 }] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    const cell = await screen.findByTestId('summary-2026-01-05-5')
    expect(cell).toHaveTextContent('7')
    expect(cell).toHaveTextContent('Svíčková')
  })

  it('redirects a non-admin member home', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('cook-summary')).not.toBeInTheDocument()
  })

  it('shows an empty-state when nobody is signed up for the day', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
        { path: '/summary', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    expect(await screen.findByTestId('summary-empty')).toBeInTheDocument()
  })
})
