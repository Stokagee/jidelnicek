import { describe, expect, it } from 'vitest'
import { cs } from './cs'

// Guards against untranslated/empty copy: every referenced string must be a
// non-empty string, so a screen never renders a blank label or a raw key.
function collectStrings(node: unknown, path = ''): Array<[string, unknown]> {
  if (typeof node === 'string') return [[path, node]]
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => collectStrings(v, path ? `${path}.${k}` : k))
  }
  return [[path, node]]
}

describe('cs translations', () => {
  it('has only non-empty string values (no blank/placeholder copy)', () => {
    for (const [path, value] of collectStrings(cs)) {
      expect(typeof value, `${path} should be a string`).toBe('string')
      expect((value as string).trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('provides the keys the EP-3 claim and login screens need', () => {
    expect(cs.claim.title).toBeTruthy()
    expect(cs.claim.submit).toBeTruthy()
    expect(cs.claim.invalidToken).toBeTruthy()
    expect(cs.login.title).toBeTruthy()
    expect(cs.login.submit).toBeTruthy()
    expect(cs.login.invalidCredentials).toBeTruthy()
    expect(cs.common.name).toBeTruthy()
    expect(cs.common.password).toBeTruthy()
  })
})
