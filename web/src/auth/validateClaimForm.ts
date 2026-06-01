import { cs } from '../i18n/cs'

/**
 * #79 (claim): client-side required-field validation for the account-setup form.
 * Returns a Czech message for the first empty field, or null when both are filled.
 *
 * Run before POST: the server's ClaimRequest requires name+password (min_length=1)
 * and returns 422 for an empty field, which ClaimPage would otherwise surface as
 * the "invalid/used link" message — blaming the token when the real problem is an
 * empty field. The token itself comes from the URL. Order: name first, then password.
 */
export function validateClaimForm(name: string, password: string): string | null {
  if (!name.trim()) return cs.claim.nameRequired
  if (!password) return cs.claim.passwordRequired
  return null
}
