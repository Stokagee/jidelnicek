/** Add `n` days to an ISO date string (YYYY-MM-DD). Uses UTC to avoid DST shifts. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/** Today's date (YYYY-MM-DD) in Europe/Prague (BR-9), so the 30-day planning
 *  window (#80) is anchored on the household's local "today". */
export function todayPrague(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
}

/** The Monday (YYYY-MM-DD) of the ISO week containing `iso`. */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // Mon=0 … Sun=6
  return addDays(iso, -dow)
}

/** Format an ISO date (YYYY-MM-DD) as Czech "D. M." — day and month, no leading
 *  zeros, no year (#47). Returns the input unchanged when it isn't an ISO date. */
export function formatDayMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])}. ${Number(m[2])}.`
}

/** Format an ISO date range as Czech "D. M. – D. M." (#47); a single-day range
 *  (start === end) collapses to one date. */
export function formatDayMonthRange(start: string, end: string): string {
  return start === end ? formatDayMonth(start) : `${formatDayMonth(start)} – ${formatDayMonth(end)}`
}
