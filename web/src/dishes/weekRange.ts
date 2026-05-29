// Date bounds for a week, used to constrain the dish day-block inputs to the
// week (Monday + 6 days). Arithmetic is done in UTC from the YYYY-MM-DD parts so
// it never shifts across the Europe/Prague offset (a local `new Date('…')` would).

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** The inclusive [min, max] ISO date range of the week starting on its Monday. */
export function weekRange(weekStartIso: string): { min: string; max: string } {
  return { min: weekStartIso, max: addDaysIso(weekStartIso, 6) }
}
