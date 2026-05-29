import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../App'
import { cs } from '../i18n/cs'
import { renderWithProviders } from '../test/render'
import { makeMe, mockFetch } from '../test/fixtures'

describe('LoginPage (FR-A4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a Czech error and stays on /login when credentials are wrong', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', status: 401, body: { detail: 'no session' } },
        { method: 'POST', path: '/auth/login', status: 401, body: { detail: 'bad' } },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/login' })
    await userEvent.type(await screen.findByTestId('login-name'), 'alice')
    await userEvent.type(screen.getByTestId('login-password'), 'wrong')
    await userEvent.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('login-error')).toHaveTextContent(cs.login.invalidCredentials)
    expect(screen.queryByTestId('this-week')).not.toBeInTheDocument()
  })

  it('lands on the protected home and keeps no tokens in localStorage on success (FR-A5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', status: 401, body: { detail: 'no session' } },
        { method: 'POST', path: '/auth/login', body: makeMe({ name: 'alice' }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/login' })
    await userEvent.type(await screen.findByTestId('login-name'), 'alice')
    await userEvent.type(screen.getByTestId('login-password'), 'secret')
    await userEvent.click(screen.getByTestId('login-submit'))

    expect(await screen.findByTestId('this-week')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })
})
