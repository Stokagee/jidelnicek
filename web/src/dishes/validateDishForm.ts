import { isValidBlock } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import type { DishFormValues } from './DishForm'

/**
 * #79: client-side required-field validation for the dish form. Returns a Czech
 * message for the first invalid field, or null when the form is submittable.
 *
 * Run before POST so the user gets a field-specific message. The server still
 * rejects an empty name / bad block with a 422, but the FE collapses every 422
 * into `invalidBlock` (see dishErrors.ts) — without this check an empty name
 * surfaces the misleading "block end before start" message.
 *
 * Order matters: report the missing name first, then the day block.
 */
export function validateDishForm(values: DishFormValues): string | null {
  if (!values.name.trim()) return cs.dish.nameRequired
  if (!values.start_date || !values.end_date) return cs.dish.noDay
  if (!isValidBlock(values.start_date, values.end_date)) return cs.dish.invalidBlock
  return null
}
