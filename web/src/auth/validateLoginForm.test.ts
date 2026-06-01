import { describe, expect, it } from 'vitest'
import { validateLoginForm } from './validateLoginForm'
import { cs } from '../i18n/cs'

// #79 (login): required-field validation so an empty field gets a field-specific
// message instead of the server's 422 → generic "something went wrong".
describe('validateLoginForm (#79 login)', () => {
  it('requires a non-empty (non-whitespace) name', () => {
    expect(validateLoginForm('', 'secret')).toBe(cs.login.nameRequired)
    expect(validateLoginForm('   ', 'secret')).toBe(cs.login.nameRequired)
  })

  it('requires a password', () => {
    expect(validateLoginForm('alice', '')).toBe(cs.login.passwordRequired)
  })

  it('reports the missing name before the missing password', () => {
    expect(validateLoginForm('', '')).toBe(cs.login.nameRequired)
  })

  it('returns null when both fields are filled', () => {
    expect(validateLoginForm('alice', 'secret')).toBeNull()
  })
})
