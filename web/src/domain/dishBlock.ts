// Pure client-side rules for dishes, mirroring the server (api/routers/dishes.py)
// so the form can validate before submitting; the server stays the source of truth.
import type { Me, Week } from '../api/types'

/**
 * FR-D1: a dish day-block is valid when its end is not before its start. Mirrors
 * the server's 422 (`end_date must not precede start_date`). ISO `YYYY-MM-DD`
 * strings compare lexicographically the same as chronologically.
 */
export function isValidBlock(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false
  return startDate <= endDate
}

/**
 * BR-6 / AC-5: only the admin or the current week's chooser may propose a dish.
 * Drives whether the "add dish" action is offered and the form is reachable.
 */
export function canPropose(me: Me | null, week: Pick<Week, 'chooser_id'> | null): boolean {
  if (!me) return false
  if (me.is_admin) return true
  return week != null && week.chooser_id === me.id
}
