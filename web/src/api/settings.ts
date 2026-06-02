// Settings resource wrappers over apiFetch (issue #77). Paths per
// api/routers/settings.py.
import { apiFetch } from './client'
import type { Settings } from './types'

/** GET /settings — any logged-in user may read the open-choosing toggle. */
export function getSettings(): Promise<Settings> {
  return apiFetch<Settings>('/settings')
}

/** PUT /settings (admin only, 403 otherwise): flip the open-choosing toggle. */
export function setOpenChoosing(open: boolean): Promise<Settings> {
  return apiFetch<Settings>('/settings', {
    method: 'PUT',
    json: { open_choosing: open },
  })
}
