import { describe, expect, it } from 'vitest'
import { weekRange } from './weekRange'

describe('weekRange', () => {
  it('spans Monday + 6 days (Mon–Sun)', () => {
    expect(weekRange('2026-01-05')).toEqual({ min: '2026-01-05', max: '2026-01-11' })
  })

  it('crosses a month boundary correctly', () => {
    expect(weekRange('2026-01-26')).toEqual({ min: '2026-01-26', max: '2026-02-01' })
  })

  it('is timezone-safe (no off-by-one in Europe/Prague)', () => {
    // A naive local Date would shift this back a day; UTC math keeps it stable.
    expect(weekRange('2026-03-30').max).toBe('2026-04-05')
  })
})
