import { describe, expect, it } from 'vitest'
import { canPropose, isValidBlock } from './dishBlock'
import { makeMe, makeWeek } from '../test/fixtures'

describe('isValidBlock (FR-D1)', () => {
  it('accepts a single-day block and an ordered range', () => {
    expect(isValidBlock('2026-01-05', '2026-01-05')).toBe(true)
    expect(isValidBlock('2026-01-05', '2026-01-07')).toBe(true)
  })

  it('rejects an end before the start (mirrors the server 422)', () => {
    expect(isValidBlock('2026-01-07', '2026-01-05')).toBe(false)
  })

  it('rejects an empty/missing date', () => {
    expect(isValidBlock('', '2026-01-07')).toBe(false)
    expect(isValidBlock('2026-01-05', '')).toBe(false)
  })
})

describe('canPropose (BR-6, AC-5)', () => {
  const week = makeWeek({ id: 9, chooser_id: 3 })

  it('allows the admin in any week', () => {
    expect(canPropose(makeMe({ id: 1, is_admin: true }), week)).toBe(true)
  })

  it('allows the chooser of the current week', () => {
    expect(canPropose(makeMe({ id: 3, is_admin: false }), week)).toBe(true)
  })

  it('rejects a non-chooser member (AC-5)', () => {
    expect(canPropose(makeMe({ id: 2, is_admin: false }), week)).toBe(false)
  })

  it('rejects when unauthenticated or no week', () => {
    expect(canPropose(null, week)).toBe(false)
    expect(canPropose(makeMe({ id: 3 }), null)).toBe(false)
  })
})
