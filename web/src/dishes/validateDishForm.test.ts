import { describe, expect, it } from 'vitest'
import { validateDishForm } from './validateDishForm'
import { cs } from '../i18n/cs'

// #79: client-side required-field validation so the user gets a field-specific
// message instead of the server's 422 (which the FE collapses into invalidBlock).
describe('validateDishForm (#79)', () => {
  const validDates = { start_date: '2026-01-05', end_date: '2026-01-07' }

  it('requires a non-empty (non-whitespace) name', () => {
    expect(validateDishForm({ name: '', ...validDates })).toBe(cs.dish.nameRequired)
    expect(validateDishForm({ name: '   ', ...validDates })).toBe(cs.dish.nameRequired)
  })

  it('requires at least one selected day', () => {
    expect(validateDishForm({ name: 'Svíčková', start_date: '', end_date: '' })).toBe(cs.dish.noDay)
  })

  it('rejects a block whose end precedes its start (FR-D1)', () => {
    expect(
      validateDishForm({ name: 'Guláš', start_date: '2026-01-08', end_date: '2026-01-06' }),
    ).toBe(cs.dish.invalidBlock)
  })

  it('reports the missing name before the block problem', () => {
    expect(validateDishForm({ name: '', start_date: '2026-01-08', end_date: '2026-01-06' })).toBe(
      cs.dish.nameRequired,
    )
  })

  it('returns null for a valid dish', () => {
    expect(validateDishForm({ name: 'Svíčková', ...validDates })).toBeNull()
  })
})
