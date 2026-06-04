// Dish resource wrappers over apiFetch (EP-5 / FR-D). Paths per api/routers/dishes.py.
import { apiFetch } from './client'
import type { Dish, DishWithSignups } from './types'

export interface DishBlockInput {
  name: string
  start_date: string // ISO date (YYYY-MM-DD)
  end_date: string
}

/**
 * FR-D1/FR-D2 (BR-6): create a dish (name + day block) in a week. The API returns
 * 403 for a non-admin, non-chooser caller (AC-5) and 422 when end_date < start_date.
 */
export function createDish(weekId: number, block: DishBlockInput): Promise<Dish> {
  return apiFetch<Dish>('/dishes', {
    method: 'POST',
    json: { week_id: weekId, ...block },
  })
}

/**
 * #80: plan a dish by date alone (no week_id). The API derives and auto-creates the
 * owning week and enforces the 30-day horizon [today, today+30] and single-ISO-week
 * rules (422 otherwise). Permission is unchanged (BR-6 / open_choosing → 403).
 */
export function createPlannedDish(block: DishBlockInput): Promise<Dish> {
  return apiFetch<Dish>('/dishes', { method: 'POST', json: block })
}

/** #80: active dishes (with signups) whose block intersects [start, end] — feeds the
 *  30-day week/month browser, which spans weeks. */
export function getDishes(start: string, end: string): Promise<DishWithSignups[]> {
  const query = new URLSearchParams({ start, end }).toString()
  return apiFetch<DishWithSignups[]>(`/dishes?${query}`)
}

/** FR-D5 (BR-5): edit a dish (proposer or admin); 403 otherwise, 422 on bad block. */
export function updateDish(dishId: number, patch: Partial<DishBlockInput>): Promise<Dish> {
  return apiFetch<Dish>(`/dishes/${dishId}`, { method: 'PATCH', json: patch })
}

/** FR-D5 (BR-5, BR-7): soft-delete a dish (proposer or admin); 403 otherwise. */
export function deleteDish(dishId: number): Promise<void> {
  return apiFetch<void>(`/dishes/${dishId}`, { method: 'DELETE' })
}
