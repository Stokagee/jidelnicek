import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, makeWeek, mockFetch } from '../test/fixtures'

describe('EditDish (FR-D5, BR-5/BR-7)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function weekWithDish() {
    return makeWeek({
      id: 9,
      start_date: '2026-01-05',
      dishes: [makeDish({ id: 5, name: 'Svíčková', proposed_by_id: 3 })],
    })
  }

  it('prefills the form for the proposer and soft-deletes back to the home', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 3, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDish() },
        { method: 'DELETE', path: '/dishes/5', body: { ok: true } },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/edit' })
    expect(await screen.findByTestId('dish-name')).toHaveValue('Svíčková')
    await userEvent.click(screen.getByTestId('dish-delete'))
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
  })

  it('redirects a non-editor member away (BR-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: weekWithDish() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/dishes/5/edit' })
    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(screen.queryByTestId('dish-name')).not.toBeInTheDocument()
  })
})
