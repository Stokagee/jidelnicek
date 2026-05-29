import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'

// Mounts UI inside the real AuthProvider (which fetches /me on mount — stub the
// global fetch first) and a MemoryRouter at the given route, so component tests
// exercise routing + identity exactly as the app wires them.
export function renderWithProviders(ui: ReactNode, { route = '/' }: { route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )
}
