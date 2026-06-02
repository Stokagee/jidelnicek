// Dish resource wrappers over apiFetch (EP-5 / FR-D). Paths per api/routers/dishes.py.
import { apiFetch } from './client'
import type { Dish } from './types'

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

/** FR-D5 (BR-5): edit a dish (proposer or admin); 403 otherwise, 422 on bad block. */
export function updateDish(dishId: number, patch: Partial<DishBlockInput>): Promise<Dish> {
  return apiFetch<Dish>(`/dishes/${dishId}`, { method: 'PATCH', json: patch })
}

/** FR-D5 (BR-5, BR-7): soft-delete a dish (proposer or admin); 403 otherwise. */
export function deleteDish(dishId: number): Promise<void> {
  return apiFetch<void>(`/dishes/${dishId}`, { method: 'DELETE' })
}
