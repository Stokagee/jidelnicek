// Frontend test fixtures — the FE analogue of tests/fixtures/factories.py.
// Typed builders for the §9 response payloads and a `mockFetch` that stands in
// for the network at the single `apiFetch` choke point. The shapes here mirror
// the live API (api/schemas/*.py); the real api/ wrappers in T-3.4+ refine them.

// A fixed reference instant: Monday 2026-01-05, 12:00 Europe/Prague — identical
// to the backend's tests/fixtures/time.py::FROZEN_NOW so FE and BE tests agree
// on "now" (BR-9). Use with vi.setSystemTime(FROZEN_NOW_PRAGUE).
export const FROZEN_NOW_PRAGUE = new Date('2026-01-05T12:00:00+01:00')

// --- §9 response shapes (mirrors api/schemas/*.py) ---------------------------

/** GET /me — note the field is `is_admin`, not `is_cook` (api/schemas/auth.py). */
export interface Me {
  id: number
  name: string | null
  is_admin: boolean
}

export interface Dish {
  id: number
  week_id: number
  name: string
  proposed_by_id: number
  // cook_id / slot are forward-compat (§11): always admin / lunch in V1. Do not
  // render UI for them; builders default them so payloads are realistic.
  cook_id: number
  slot: string
  start_date: string // ISO date (YYYY-MM-DD)
  end_date: string
}

export interface Week {
  id: number
  start_date: string
  chooser_id: number | null
  dishes: Dish[]
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

// --- builders ----------------------------------------------------------------

let seq = 0
const nextId = () => (seq += 1)

/** Reset the id counter — call in beforeEach if a test needs stable ids. */
export function resetFixtureIds(): void {
  seq = 0
}

export function makeMe(overrides: Partial<Me> = {}): Me {
  return { id: nextId(), name: 'alice', is_admin: false, ...overrides }
}

export function makeDish(overrides: Partial<Dish> = {}): Dish {
  const id = overrides.id ?? nextId()
  return {
    id,
    week_id: 1,
    name: 'Svíčková',
    proposed_by_id: 1,
    cook_id: 1,
    slot: 'lunch',
    start_date: '2026-01-05',
    end_date: '2026-01-07',
    ...overrides,
  }
}

export function makeWeek(overrides: Partial<Week> = {}): Week {
  return {
    id: 1,
    start_date: '2026-01-05',
    chooser_id: null,
    dishes: [],
    ...overrides,
  }
}

export function makeSignup(overrides: Partial<Signup> = {}): Signup {
  return {
    id: nextId(),
    dish_id: 1,
    user_id: 1,
    day: '2026-01-05',
    portions: 1,
    ...overrides,
  }
}

// --- network mock ------------------------------------------------------------

export interface MockRoute {
  method?: string // defaults to any method
  path: string // matched against the URL pathname (suffix match)
  status?: number // defaults to 200
  body?: unknown // JSON-serialised into the Response
}

/**
 * A `vi.fn()` fetch replacement. Matches a request to the first route by
 * (method, path-suffix) and returns a JSON Response. Every call is asserted to
 * pass `credentials: 'include'` — the cookies-only session rule (FR-A5); a
 * missing/!= 'include' credentials option throws so the test fails loudly.
 * Unmatched requests resolve to 404 so a test notices an un-stubbed call.
 */
export function mockFetch(routes: MockRoute[]): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.credentials !== 'include') {
      throw new Error(
        `apiFetch must send credentials:'include' (FR-A5); got ${String(init?.credentials)}.`,
      )
    }
    const url = typeof input === 'string' ? input : input.toString()
    const pathname = (() => {
      try {
        return new URL(url, 'http://localhost').pathname
      } catch {
        return url
      }
    })()
    const method = (init?.method ?? 'GET').toUpperCase()
    const route = routes.find(
      (r) => (r.method ? r.method.toUpperCase() === method : true) && pathname.endsWith(r.path),
    )
    if (!route) {
      return new Response(JSON.stringify({ detail: `no mock route for ${method} ${pathname}` }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(route.body === undefined ? null : JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}
