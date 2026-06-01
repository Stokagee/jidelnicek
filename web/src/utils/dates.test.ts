import { describe, expect, it } from 'vitest'
import { addDays, formatDayMonth, formatDayMonthRange } from './dates'

describe('addDays', () => {
  it('adds days across month boundaries without DST drift', () => {
    expect(addDays('2026-01-05', 2)).toBe('2026-01-07')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })
})

// #47: dates are shown in Czech "D. M." form (day and month, no leading zeros,
// no year) rather than the raw ISO YYYY-MM-DD.
describe('formatDayMonth (#47)', () => {
  it('formats an ISO date as Czech day. month. without leading zeros', () => {
    expect(formatDayMonth('2026-01-05')).toBe('5. 1.')
    expect(formatDayMonth('2026-12-25')).toBe('25. 12.')
    expect(formatDayMonth('2026-05-31')).toBe('31. 5.')
  })

  it('returns the input unchanged when it is not an ISO date', () => {
    expect(formatDayMonth('')).toBe('')
    expect(formatDayMonth('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDayMonthRange (#47)', () => {
  it('joins start and end with an en dash', () => {
    expect(formatDayMonthRange('2026-01-05', '2026-01-07')).toBe('5. 1. – 7. 1.')
  })

  it('collapses a single-day block to one date', () => {
    expect(formatDayMonthRange('2026-01-05', '2026-01-05')).toBe('5. 1.')
  })
})
