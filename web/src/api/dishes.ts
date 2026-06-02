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

export interface OpenDishInput {
  name: string
  start_date: string
  end_date: string
  slot: string // 'lunch' | 'dinner'
}

/**
 * #77 open mode: create a dish for a (day, slot) without a week — the server
 * derives and auto-creates the week (#80). 409 when another active dish of that
 * slot already covers one of the days; 422 outside the 30-day window.
 */
export function createOpenDish(input: OpenDishInput): Promise<Dish> {
  return apiFetch<Dish>('/dishes', { method: 'POST', json: input })
}

/** #80: active dishes (with signups) whose block intersects [start, end]. */
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
