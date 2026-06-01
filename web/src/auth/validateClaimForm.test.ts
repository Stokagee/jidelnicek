import { describe, expect, it } from 'vitest'
import { validateClaimForm } from './validateClaimForm'
import { cs } from '../i18n/cs'

// #79 (claim): required-field validation so an empty field gets a field-specific
// message instead of the server's 422 → "invalid/used link" (which blames the token).
describe('validateClaimForm (#79 claim)', () => {
  it('requires a non-empty (non-whitespace) name', () => {
    expect(validateClaimForm('', 'secret')).toBe(cs.claim.nameRequired)
    expect(validateClaimForm('   ', 'secret')).toBe(cs.claim.nameRequired)
  })

  it('requires a password', () => {
    expect(validateClaimForm('nora', '')).toBe(cs.claim.passwordRequired)
  })

  it('reports the missing name before the missing password', () => {
    expect(validateClaimForm('', '')).toBe(cs.claim.nameRequired)
  })

  it('returns null when both fields are filled', () => {
    expect(validateClaimForm('nora', 'secret')).toBeNull()
  })
})
