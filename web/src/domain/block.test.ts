import { describe, expect, it } from 'vitest'
import { daysInBlock, isDayInBlock } from './block'

describe('isDayInBlock (BR-2, AC-1)', () => {
  it('accepts the boundaries and an interior day', () => {
    expect(isDayInBlock('2026-01-05', '2026-01-05', '2026-01-07')).toBe(true)
    expect(isDayInBlock('2026-01-07', '2026-01-05', '2026-01-07')).toBe(true)
    expect(isDayInBlock('2026-01-06', '2026-01-05', '2026-01-07')).toBe(true)
  })

  it('rejects a day outside the block (AC-1)', () => {
    expect(isDayInBlock('2026-01-04', '2026-01-05', '2026-01-07')).toBe(false)
    expect(isDayInBlock('2026-01-08', '2026-01-05', '2026-01-07')).toBe(false)
  })
})

describe('daysInBlock', () => {
  it('enumerates an inclusive range', () => {
    expect(daysInBlock('2026-01-05', '2026-01-07')).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
    ])
  })

  it('returns a single day for a one-day block', () => {
    expect(daysInBlock('2026-01-05', '2026-01-05')).toEqual(['2026-01-05'])
  })

  it('crosses a month boundary in UTC (no off-by-one)', () => {
    expect(daysInBlock('2026-01-30', '2026-02-01')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
    ])
  })

  it('is empty when the block is inverted', () => {
    expect(daysInBlock('2026-01-07', '2026-01-05')).toEqual([])
  })
})
