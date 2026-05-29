// Cook summary wrapper over apiFetch (EP-7 / FR-K). Admin only on the server.
import { apiFetch } from './client'
import type { DishPortions } from './types'

/**
 * FR-K1/FR-K2/FR-K3: per-dish active-portion totals for a given day in a week
 * (includes the admin's own portions — AC-4). Admin only (403 otherwise).
 */
export function getSummary(weekId: number, day: string): Promise<DishPortions[]> {
  return apiFetch<DishPortions[]>(`/summary?week=${weekId}&day=${day}`)
}
