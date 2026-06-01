// Login screen (§14.2, FR-A4). Name + password → session cookie; on success the
// cached identity is updated and we land on "This week". Bad credentials surface
// a Czech error without leaking which field was wrong.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { ApiError } from '../api/client'
import { cs } from '../i18n/cs'
import { useAuth } from './useAuth'
import { validateLoginForm } from './validateLoginForm'

export function LoginPage() {
  const navigate = useNavigate()
  const { setMe } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const validationError = validateLoginForm(name, password) // #79: required fields before POST.
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      const me = await login(name, password)
      setMe(me)
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.isUnauthorized
          ? cs.login.invalidCredentials
          : cs.common.genericError,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <h1>{cs.login.title}</h1>
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>{cs.common.name}</span>
          <input
            data-testid="login-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="field">
          <span>{cs.common.password}</span>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p data-testid="login-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button data-testid="login-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : cs.login.submit}
        </button>
      </form>
    </main>
  )
}
