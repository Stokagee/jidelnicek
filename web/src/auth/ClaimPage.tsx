// Claim / account-setup screen (§14.1, FR-A3, AC-11). Reached from a one-time
// claim link /claim/:token; sets name + password, consumes the token, and logs
// in. A used/invalid token surfaces a Czech error (the token is single-use).
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { claim } from '../api/auth'
import { cs } from '../i18n/cs'
import { useAuth } from './useAuth'
import { validateClaimForm } from './validateClaimForm'

export function ClaimPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setMe } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const validationError = validateClaimForm(name, password) // #79: required fields before POST.
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const me = await claim(token ?? '', name, password)
      setMe(me)
      navigate('/', { replace: true })
    } catch {
      // Any failure here means the token is invalid or already used (FR-A3).
      setError(cs.claim.invalidToken)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <h1>{cs.claim.title}</h1>
      <p>{cs.claim.intro}</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>{cs.common.name}</span>
          <input
            data-testid="claim-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="field">
          <span>{cs.common.password}</span>
          <input
            data-testid="claim-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p data-testid="claim-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button data-testid="claim-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : cs.claim.submit}
        </button>
      </form>
    </main>
  )
}
