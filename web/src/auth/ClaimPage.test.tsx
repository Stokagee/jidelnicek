import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeMe, mockFetch } from '../test/fixtures'

// AC-11 (FR-A3) at the component level; the browser end-to-end path lives in
// tests/acceptance/suites/fe_ep3_auth_ui.robot.
describe('ClaimPage (FR-A3, AC-11)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('claims the account from the token and lands on the protected home', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', status: 401, body: { detail: 'no session' } },
        { method: 'POST', path: '/auth/claim', body: makeMe({ name: 'nora' }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/claim/good-token' })
    await userEvent.type(await screen.findByTestId('claim-name'), 'nora')
    await userEvent.type(screen.getByTestId('claim-password'), 'long-enough-pw')
    await userEvent.click(screen.getByTestId('claim-submit'))

    expect(await screen.findByTestId('home')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('shows an error for a used/invalid token (single-use, AC-11)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', status: 401, body: { detail: 'no session' } },
        {
          method: 'POST',
          path: '/auth/claim',
          status: 400,
          body: { detail: 'Invalid claim token' },
        },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/claim/used-token' })
    await userEvent.type(await screen.findByTestId('claim-name'), 'nora')
    await userEvent.type(screen.getByTestId('claim-password'), 'long-enough-pw')
    await userEvent.click(screen.getByTestId('claim-submit'))

    expect(await screen.findByTestId('claim-error')).toHaveTextContent(cs.claim.invalidToken)
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })
})
