// Dish day-block helpers, mirroring the server's BR-2 (a signup day must lie
// within the dish block). ISO `YYYY-MM-DD` strings compare and iterate in UTC so
// there is no Europe/Prague off-by-one.

/** BR-2 / AC-1: is the day within the inclusive [start, end] block? */
export function isDayInBlock(day: string, startIso: string, endIso: string): boolean {
  if (!day || !startIso || !endIso) return false
  return startIso <= day && day <= endIso
}

/** The list of ISO days the block covers (inclusive). Empty if the block is invalid. */
export function daysInBlock(startIso: string, endIso: string): string[] {
  if (!isDayInBlock(startIso, startIso, endIso)) return [] // guards start <= end
  const [y, m, d] = startIso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const days: string[] = []
  let cur = startIso
  while (cur <= endIso) {
    days.push(cur)
    dt.setUTCDate(dt.getUTCDate() + 1)
    cur = dt.toISOString().slice(0, 10)
  }
  return days
}
