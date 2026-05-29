import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { AppRoutes } from '../App'
import { renderWithProviders } from '../test/render'
import { makeMe, makeWeek, mockFetch } from '../test/fixtures'

// AC-5 (FR-W4/BR-6) surfaced in the UI: only the admin or the week's chooser is
// offered the add-dish action on the home screen.
describe('Home add-dish action (AC-5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers the add-dish action to the admin', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 1, is_admin: true }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: null }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('action-propose-dish')).toBeInTheDocument()
  })

  it('offers it to the week chooser', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 3, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('action-propose-dish')).toBeInTheDocument()
  })

  it('hides it from a non-chooser member (AC-5)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { path: '/me', body: makeMe({ id: 2, is_admin: false }) },
        { path: '/weeks/current', body: makeWeek({ id: 9, chooser_id: 3 }) },
      ]),
    )
    renderWithProviders(<AppRoutes />, { route: '/' })
    expect(await screen.findByTestId('home')).toBeInTheDocument()
    expect(screen.queryByTestId('action-propose-dish')).not.toBeInTheDocument()
  })
})
