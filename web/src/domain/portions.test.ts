import { describe, expect, it } from 'vitest'
import { isValidPortions } from './portions'

describe('isValidPortions (BR-4, AC-2)', () => {
  it('accepts whole numbers >= 1', () => {
    expect(isValidPortions(1)).toBe(true)
    expect(isValidPortions(3)).toBe(true)
  })

  it('rejects zero, negatives and fractions (AC-2)', () => {
    expect(isValidPortions(0)).toBe(false)
    expect(isValidPortions(-1)).toBe(false)
    expect(isValidPortions(1.5)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidPortions(Number.NaN)).toBe(false)
  })
})
