import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, mockFetch } from '../test/fixtures'
import { addDays } from '../utils/dates'

function todayPrague(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
}

function postBodies(fetchMock: typeof fetch): unknown[] {
  return (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls
    .filter((c) => (c[1] as RequestInit)?.method === 'POST')
    .map((c) => JSON.parse((c[1] as RequestInit).body as string))
}

describe('Planner — 30-day grid (#77, #80)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders an existing dish in its (day, slot) cell with a signup link', async () => {
    const today = todayPrague()
    const dish = makeDish({ id: 5, name: 'Svíčková', slot: 'lunch', start_date: today, end_date: today })
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/settings', body: { open_choosing: true } },
        { method: 'GET', path: '/dishes', body: [dish] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/planner' })

    const cell = await screen.findByTestId(`cell-${today}-lunch`)
    expect(within(cell).getByTestId('planner-dish-5')).toHaveTextContent('Svíčková')
    expect(within(cell).getByTestId('planner-signup-5')).toBeInTheDocument()
  })

  it('with open choosing on, a member adds a dish into an empty cell (#77)', async () => {
    const today = todayPrague()
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
      { path: '/settings', body: { open_choosing: true } },
      { method: 'GET', path: '/dishes', body: [] },
      { method: 'POST', path: '/dishes', status: 201, body: makeDish({ id: 9, name: 'Čočka' }) },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/planner' })

    await userEvent.click(await screen.findByTestId(`add-${today}-dinner`))
    await userEvent.type(screen.getByTestId(`add-name-${today}-dinner`), 'Čočka')
    await userEvent.click(screen.getByTestId(`add-confirm-${today}-dinner`))

    await vi.waitFor(() => expect(postBodies(fetchMock)).toHaveLength(1))
    expect(postBodies(fetchMock)[0]).toEqual({
      name: 'Čočka',
      start_date: today,
      end_date: today,
      slot: 'dinner',
    })
  })

  it('shows a conflict message when the slot is already taken that day (#77)', async () => {
    const today = todayPrague()
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/settings', body: { open_choosing: true } },
        { method: 'GET', path: '/dishes', body: [] },
        { method: 'POST', path: '/dishes', status: 409, body: { detail: 'taken' } },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/planner' })

    await userEvent.click(await screen.findByTestId(`add-${today}-lunch`))
    await userEvent.type(screen.getByTestId(`add-name-${today}-lunch`), 'Pizza')
    await userEvent.click(screen.getByTestId(`add-confirm-${today}-lunch`))

    expect(await screen.findByTestId(`add-error-${today}-lunch`)).toHaveTextContent(cs.dish.conflict)
  })

  it('with open choosing off, the grid is read-only — no add buttons', async () => {
    const today = todayPrague()
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/settings', body: { open_choosing: false } },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/planner' })

    expect(await screen.findByText(cs.planner.closedNote)).toBeInTheDocument()
    // A representative empty cell offers no add affordance.
    expect(screen.queryByTestId(`add-${addDays(today, 3)}-lunch`)).not.toBeInTheDocument()
  })
})
