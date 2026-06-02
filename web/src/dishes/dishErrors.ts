import { ApiError } from '../api/client'
import { cs } from '../i18n/cs'

/** Map a failed dish request to a Czech message: 403 → forbidden (BR-5/BR-6),
 *  409 → slot already taken that day (#77), 422 → invalid block (FR-D1),
 *  anything else → generic. */
export function dishErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return cs.dish.forbidden
    if (err.status === 409) return cs.dish.conflict
    if (err.status === 422) return cs.dish.invalidBlock
  }
  return cs.common.genericError
}
