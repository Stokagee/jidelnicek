import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeMe, mockFetch } from '../test/fixtures'

// FR-A5/FR-A6: the protected layout gates on the /me check done once on mount.
describe('ProtectedRoute', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects an unauthenticated visitor to /login (FR-A5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ path: '/me', status: 401, body: { detail: 'no session' } }]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('renders the protected screen for an authenticated visitor (FR-A6)', async () => {
    vi.stubGlobal('fetch', mockFetch([{ path: '/me', body: makeMe({ name: 'alice' }) }]))
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('home')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })
})
