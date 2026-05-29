import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, makeWeek, mockFetch } from '../test/fixtures'

const weekWithDishes = () =>
  makeWeek({
    id: 9,
    chooser_id: 3,
    dishes: [makeDish({ id: 5, name: 'Svíčková', proposed_by_id: 1 })],
  })

describe('ThisWeek (§14.3 hub)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists dishes and links each to its signup screen', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('dish-5')).toBeInTheDocument()
    expect(screen.getByTestId('dish-5-signup')).toHaveAttribute('href', '/dishes/5/signup')
  })

  it('shows the add-dish action and cook-summary link to the admin', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: weekWithDishes() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    // Await the dish list (needs the week loaded), then the admin-only actions.
    expect(await screen.findByTestId('dish-5-edit')).toBeInTheDocument()
    expect(screen.getByTestId('action-propose-dish')).toBeInTheDocument()
    expect(screen.getByTestId('link-cook-summary')).toBeInTheDocument()
  })

  it('hides admin/chooser actions from a non-chooser member (AC-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('action-propose-dish')).not.toBeInTheDocument()
    expect(screen.queryByTestId('link-cook-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dish-5-edit')).not.toBeInTheDocument()
  })

  it('shows an empty-state when the week has no dishes', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2 }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, dishes: [] }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('week-empty')).toBeInTheDocument()
  })
})
