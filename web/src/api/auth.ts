// Auth resource wrappers over apiFetch (EP-3 / FR-A). The session is a cookie set
// by the API on claim/login, so these return the identity payload and never touch
// localStorage. Paths mirror api/routers/auth.py.
import { apiFetch } from './client'
import type { Me } from './types'

/** FR-A3: set name + password from a single-use claim token; logs the user in. */
export function claim(token: string, name: string, password: string): Promise<Me> {
  return apiFetch<Me>('/auth/claim', { method: 'POST', json: { token, name, password } })
}

/** FR-A4: authenticate by name + password; bad credentials → ApiError(401). */
export function login(name: string, password: string): Promise<Me> {
  return apiFetch<Me>('/auth/login', { method: 'POST', json: { name, password } })
}

/** FR-A4: end the session (clears the cookie). */
export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

/** FR-A6: who am I + am I admin. Throws ApiError(401) when unauthenticated. */
export function getMe(): Promise<Me> {
  return apiFetch<Me>('/me')
}
