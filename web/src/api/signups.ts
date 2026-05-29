// Signup resource wrappers over apiFetch (EP-6 / FR-S). Paths per api/routers/signups.py.
// Note: there is no GET endpoint for signups, so the UI tracks the row it just
// created/updated (the response carries the id) to allow change/cancel in-session.
import { apiFetch } from './client'
import type { Signup } from './types'

/**
 * FR-S1/FR-S2/FR-S3: sign up for a dish on a day inside its block. The API
 * upserts the active (dish, user, day) row (BR-3/AC-3) and returns 422 when the
 * day is outside the block (BR-2/AC-1) or portions < 1 (BR-4/AC-2).
 */
export function createSignup(dishId: number, day: string, portions: number): Promise<Signup> {
  return apiFetch<Signup>('/signups', {
    method: 'POST',
    json: { dish_id: dishId, day, portions },
  })
}

/** FR-S4: the owner changes the portion count (403 if not theirs). */
export function updateSignup(signupId: number, portions: number): Promise<Signup> {
  return apiFetch<Signup>(`/signups/${signupId}`, { method: 'PATCH', json: { portions } })
}

/** FR-S5 (BR-7): cancel = soft-delete the signup (403 if not theirs). */
export function cancelSignup(signupId: number): Promise<void> {
  return apiFetch<void>(`/signups/${signupId}`, { method: 'DELETE' })
}
