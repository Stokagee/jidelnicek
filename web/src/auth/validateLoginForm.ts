import { cs } from '../i18n/cs'

/**
 * #79 (login): client-side required-field validation for the login form. Returns
 * a Czech message for the first empty field, or null when both are filled.
 *
 * Run before POST: the server's LoginRequest requires name+password (min_length=1)
 * and returns 422 for an empty field, which LoginPage would otherwise surface as
 * the generic "something went wrong" message instead of telling the user what to
 * enter. Order: name first, then password.
 */
export function validateLoginForm(name: string, password: string): string | null {
  if (!name.trim()) return cs.login.nameRequired
  if (!password) return cs.login.passwordRequired
  return null
}
