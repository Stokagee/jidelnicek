// Week resource wrappers over apiFetch (EP-4 / FR-W). Paths per api/routers/weeks.py.
import { apiFetch } from './client'
import type { Week } from './types'

/** FR-W1: the current week (its Monday), with active dishes. 404 if none seeded. */
export function getCurrentWeek(): Promise<Week> {
  return apiFetch<Week>('/weeks/current')
}

/** FR-W2/FR-W3 (BR-1): admin sets chooser + their days. Admin only (403 otherwise). */
export function setChooser(
  weekId: number,
  chooserId: number,
  chooserStartDate?: string | null,
  chooserEndDate?: string | null,
): Promise<Week> {
  return apiFetch<Week>(`/weeks/${weekId}/chooser`, {
    method: 'PUT',
    json: {
      chooser_id: chooserId,
      chooser_start_date: chooserStartDate ?? null,
      chooser_end_date: chooserEndDate ?? null,
    },
  })
}
