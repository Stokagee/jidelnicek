import { createContext } from 'react'
import type { Me } from '../api/types'

export interface AuthState {
  me: Me | null
  loading: boolean
  /** Set the cached identity after login/claim/logout without a round-trip. */
  setMe: (me: Me | null) => void
  /** Re-fetch /me (e.g. to revalidate the session). */
  reload: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
