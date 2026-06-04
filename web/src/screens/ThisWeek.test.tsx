import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { FROZEN_NOW_PRAGUE, makeDish, makeMe, makeWeek, mockFetch } from '../test/fixtures'

// #80: the screen is anchored on Europe/Prague "today", so freeze it to the shared
// reference Monday 2026-01-05 — the same instant the fixtures' dish dates sit on.
const weekWithDishes = () =>
  makeWeek({
    id: 9,
    chooser_id: 3,
    dishes: [makeDish({ id: 5, name: 'Svíčková', proposed_by_id: 1 })],
  })

describe('ThisWeek (§14.3 hub)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FROZEN_NOW_PRAGUE)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lists dishes and links each to its signup screen', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('dish-5')).toBeInTheDocument()
    expect(screen.getByTestId('dish-5-signup')).toHaveAttribute('href', '/dishes/5/signup')
  })

  it('shows the dish block as a Czech day-month range, not raw ISO (#47)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    const dish = await screen.findByTestId('dish-5')
    // makeDish defaults to 2026-01-05 .. 2026-01-07.
    expect(dish).toHaveTextContent('5. 1. – 7. 1.')
    expect(dish).not.toHaveTextContent('2026-01-05')
  })

  it('shows the add-dish action and cook-summary link to the admin', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: weekWithDishes() },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
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
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('action-propose-dish')).not.toBeInTheDocument()
    expect(screen.queryByTestId('link-cook-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dish-5-edit')).not.toBeInTheDocument()
  })

  it('shows the add-dish action to any member when open choosing is on (#77)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
        { path: '/settings', body: { open_choosing: true } },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('action-propose-dish')).toBeInTheDocument()
  })

  it('shows an empty-state when the week has no dishes', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2 }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, dishes: [] }) },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('week-empty')).toBeInTheDocument()
  })

  // #80 --------------------------------------------------------------------- //

  it('pages forward to the next week within the 30-day window (#80)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDishes() },
        {
          method: 'GET',
          path: '/dishes',
          body: [
            makeDish({ id: 5, start_date: '2026-01-05', end_date: '2026-01-07' }),
            makeDish({ id: 8, name: 'Guláš', start_date: '2026-01-12', end_date: '2026-01-12' }),
          ],
        },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('dish-5')).toBeInTheDocument()
    expect(screen.getByTestId('week-label')).toHaveTextContent('5. 1. – 11. 1.')

    await userEvent.click(screen.getByTestId('week-next'))

    expect(await screen.findByTestId('dish-8')).toBeInTheDocument()
    expect(screen.queryByTestId('dish-5')).not.toBeInTheDocument()
    expect(screen.getByTestId('week-label')).toHaveTextContent('12. 1. – 18. 1.')
  })

  it('renders the 30-day month grid: a dot on dish days, plan-link on empty days (#80)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, dishes: [] }) },
        {
          method: 'GET',
          path: '/dishes',
          body: [makeDish({ id: 5, start_date: '2026-01-05', end_date: '2026-01-05' })],
        },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    await userEvent.click(await screen.findByTestId('view-month'))

    expect(await screen.findByTestId('month-grid')).toBeInTheDocument()
    // The dish day links to its signup; an empty in-window day links to planning.
    expect(screen.getByTestId('day-2026-01-05')).toHaveAttribute('href', '/dishes/5/signup')
    expect(screen.getByTestId('day-2026-01-15-add')).toHaveAttribute(
      'href',
      '/dishes/new?date=2026-01-15',
    )
  })
})
