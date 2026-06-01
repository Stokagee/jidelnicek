// Canonical TypeScript shapes for the §9 API surface, mirroring api/schemas/*.py.
// The test fixtures (src/test/fixtures.ts) re-use these so test data and
// production types never drift.

/** GET /me — note the field is `is_admin`, not `is_cook` (api/schemas/auth.py). */
export interface Me {
  id: number
  name: string | null
  is_admin: boolean
}

/** GET /users — household member roster (T-4.3, T-7.3). */
export interface User {
  id: number
  name: string | null
  is_admin: boolean
}

/** Per-dish signup entry embedded in WeekResponse (FR-K3). */
export interface SignupInWeek {
  id: number
  user_id: number
  user_name: string | null
  day: string
  portions: number
}

export interface Dish {
  id: number
  week_id: number
  name: string
  proposed_by_id: number
  // cook_id / slot are forward-compat (§11): always admin / lunch in V1. Do not
  // render UI for them.
  cook_id: number
  slot: string
  start_date: string // ISO date (YYYY-MM-DD)
  end_date: string
}

export interface DishWithSignups extends Dish {
  signups: SignupInWeek[]
}

export interface Week {
  id: number
  start_date: string
  chooser_id: number | null
  chooser_start_date: string | null
  chooser_end_date: string | null
  dishes: DishWithSignups[]
}

export interface Signup {
  id: number
  dish_id: number
  user_id: number
  day: string
  portions: number
}

/** One row of the cook summary (api/schemas/summary.py::DishPortions). */
export interface DishPortions {
  dish_id: number
  name: string
  portions: number
}
