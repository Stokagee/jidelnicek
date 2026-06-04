import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeDish, makeMe, makeUser, makeWeek, mockFetch } from '../test/fixtures'
import { addDays, formatDayMonth } from '../utils/dates'

const twoMembers = () => [
  makeUser({ id: 1, name: 'admin', is_admin: true }),
  makeUser({ id: 2, name: 'alice', is_admin: false }),
]

describe('CookSummary (§14.5, AC-4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows per-dish portion totals from embedded signups (AC-4)', async () => {
    // Use today's date so the cell falls within the daysFromToday() window.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
    const mondayOfWeek = (() => {
      const [y, m, d] = today.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay() + 1) // rewind to Monday
      return dt.toISOString().slice(0, 10)
    })()
    const dish = makeDish({
      id: 5,
      name: 'Svíčková',
      start_date: today,
      end_date: today,
      signups: [{ id: 1, user_id: 1, user_name: 'admin', day: today, portions: 7 }],
    })
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: mondayOfWeek }) },
        { path: '/users', body: twoMembers() },
        // #80: the summary table now reads the 30-day range, not week.dishes.
        { method: 'GET', path: '/dishes', body: [dish] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    const cell = await screen.findByTestId(`summary-${today}-5`)
    expect(cell).toHaveTextContent('7')

    // Column header shows the date day-first ("D. M."), not month-first (MM-DD).
    expect(screen.getByText(formatDayMonth(today))).toBeInTheDocument()
    expect(screen.queryByText(today.slice(5))).not.toBeInTheDocument()
  })

  it('shows every planned dish-day across 30 days, incl. days not yet ordered (#93)', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
    const far = addDays(today, 20) // ~3 weeks out, still inside the 30-day window
    const ordered = makeDish({
      id: 5,
      name: 'Svíčková',
      start_date: far,
      end_date: far,
      signups: [{ id: 1, user_id: 1, user_name: 'a', day: far, portions: 2 }],
    })
    const tenDaysOut = addDays(today, 10)
    const planned = makeDish({
      id: 6,
      name: 'Guláš',
      start_date: tenDaysOut,
      end_date: tenDaysOut,
      signups: [],
    })
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: today }) },
        { path: '/users', body: twoMembers() },
        { method: 'GET', path: '/dishes', body: [ordered, planned] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    // A dish 20 days out shows its ordered portions (full 30-day reach)…
    expect(await screen.findByTestId(`summary-${far}-5`)).toHaveTextContent('2')
    // …and a planned dish nobody has ordered yet still appears (0 portions).
    expect(screen.getByTestId(`summary-${tenDaysOut}-6`)).toBeInTheDocument()
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

  it('shows empty-state when week has no dishes', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05', dishes: [] }) },
        { path: '/users', body: twoMembers() },
        { method: 'GET', path: '/dishes', body: [] },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    expect(await screen.findByTestId('summary-empty')).toBeInTheDocument()
  })

  it('shows the chooser select with all members and the current chooser (T-4.3)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: 2 }) },
        { path: '/users', body: twoMembers() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    const current = await screen.findByTestId('chooser-current')
    expect(current).toHaveTextContent('alice')

    const select = screen.getByTestId('chooser-select') as HTMLSelectElement
    expect(select.value).toBe('2')

    expect(screen.getByRole('option', { name: 'admin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'alice' })).toBeInTheDocument()
  })

  it('shows the chooser range as a Czech day-month range, not raw ISO (#47)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        {
          path: '/weeks/current',
          body: makeWeek({
            id: 9,
            start_date: '2026-01-05',
            chooser_id: 2,
            chooser_start_date: '2026-01-05',
            chooser_end_date: '2026-01-11',
          }),
        },
        { path: '/users', body: twoMembers() },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })
    const current = await screen.findByTestId('chooser-current')
    expect(current).toHaveTextContent('5. 1. – 11. 1.')
    expect(current).not.toHaveTextContent('2026-01-05')
  })

  it('admin button gives everyone permission, which PUTs /settings (#77)', async () => {
    const fetchMock = mockFetch([
      { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
      { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05' }) },
      { path: '/users', body: twoMembers() },
      { method: 'GET', path: '/settings', body: { open_choosing: false } },
      { method: 'PUT', path: '/settings', body: { open_choosing: true } },
    ])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    const button = (await screen.findByTestId('open-choosing-button')) as HTMLButtonElement
    expect(button).toHaveTextContent(cs.cookSummary.openChoosing.enable)
    await userEvent.click(button)

    const putBody = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter((c) => (c[1] as RequestInit)?.method === 'PUT')
      .map((c) => JSON.parse((c[1] as RequestInit).body as string))
    expect(putBody).toEqual([{ open_choosing: true }])
    // Now on: the button flips to the "turn it off" label (it can be toggled back).
    await vi.waitFor(() => expect(button).toHaveTextContent(cs.cookSummary.openChoosing.disable))
  })

  it('admin picks chooser, opens day picker, confirms and sees saved (FR-W2, T-4.3)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: null }) },
        { path: '/users', body: twoMembers() },
        {
          method: 'PUT',
          path: '/weeks/9/chooser',
          body: makeWeek({ id: 9, start_date: '2026-01-05', chooser_id: 2 }),
        },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/cook-summary' })

    // Step 1: pick person and click "Nastav volitele"
    const select = await screen.findByTestId('chooser-select')
    await userEvent.selectOptions(select, '2')
    await userEvent.click(screen.getByTestId('chooser-save'))

    // Step 2: day picker appears — click confirm without selecting days
    const confirm = await screen.findByTestId('chooser-confirm')
    await userEvent.click(confirm)

    expect(await screen.findByTestId('chooser-saved')).toBeInTheDocument()
  })
})
