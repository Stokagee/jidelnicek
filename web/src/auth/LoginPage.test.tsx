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

  it('blocks submit and shows a field error when a required field is empty (#79)', async () => {
    const fetchMock = mockFetch([{ path: '/me', status: 401, body: { detail: 'no session' } }])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<AppRoutes />, { route: '/login' })
    // Click "log in" with empty fields: the user must see what to enter, not the
    // generic "something went wrong" the server's 422 would otherwise surface (#79).
    await userEvent.click(await screen.findByTestId('login-submit'))
    expect(await screen.findByTestId('login-error')).toHaveTextContent(cs.login.nameRequired)

    // With a name but no password, the password is called out.
    await userEvent.type(screen.getByTestId('login-name'), 'alice')
    await userEvent.click(screen.getByTestId('login-submit'))
    expect(await screen.findByTestId('login-error')).toHaveTextContent(cs.login.passwordRequired)

    // No login POST should have been attempted.
    const posted = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.some(
      (c) => (c[1] as RequestInit)?.method === 'POST',
    )
    expect(posted).toBe(false)
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
