import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeMe, makeUser, makeWeek, mockFetch } from '../test/fixtures'

const twoMembers = () => [
  makeUser({ id: 1, name: 'admin', is_admin: true }),
  makeUser({ id: 2, name: 'alice', is_admin: false }),
]

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
        { path: '/users', body: twoMembers() },
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
        { path: '/users', body: twoMembers() },
        { path: '/summary', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    expect(await screen.findByTestId('summary-empty')).toBeInTheDocument()
  })

  // FR-W2/FR-W3 (T-4.3): admin can pick and save the week's chooser.
  it('shows the chooser select with all members and the current chooser (T-4.3)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        {
          path: '/weeks/current',
          body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: 2 }),
        },
        { path: '/users', body: twoMembers() },
        { path: '/summary', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    // Current chooser name is displayed.
    const current = await screen.findByTestId('chooser-current')
    expect(current).toHaveTextContent('alice')

    // Select is pre-set to the current chooser.
    const select = screen.getByTestId('chooser-select') as HTMLSelectElement
    expect(select.value).toBe('2')

    // Both members appear as options.
    expect(screen.getByRole('option', { name: 'admin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'alice' })).toBeInTheDocument()
  })

  it('admin changes chooser and sees confirmation (FR-W2, T-4.3)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        {
          path: '/weeks/current',
          body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: null }),
        },
        { path: '/users', body: twoMembers() },
        { path: '/summary', body: [] },
        {
          method: 'PUT',
          path: '/weeks/9/chooser',
          body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: 2 }),
        },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    const select = await screen.findByTestId('chooser-select')
    await userEvent.selectOptions(select, '2')
    await userEvent.click(screen.getByTestId('chooser-save'))

    expect(await screen.findByTestId('chooser-saved')).toBeInTheDocument()
    // Current label updates to the new chooser's name.
    expect(screen.getByTestId('chooser-current')).toHaveTextContent('alice')
  })
})
