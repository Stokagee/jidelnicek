// Signup screen (§14.4, FR-S1/FR-S2/FR-S4/FR-S5). Reached at /dishes/:id/signup
// from the dish in "This week". Pick one or more days inside the dish block +
// portions and sign up; the in-session signups can then all be cancelled at once.
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Signup, Week } from '../api/types'
import { ApiError } from '../api/client'
import { cancelSignup, createSignup } from '../api/signups'
import { getCurrentWeek } from '../api/weeks'
import { ThemeToggle } from '../components/ThemeToggle'
import { WeekCalendar } from '../components/WeekCalendar'
import { isDayInBlock } from '../domain/block'
import { addDays } from '../utils/dates'
import { isValidPortions } from '../domain/portions'
import { cs } from '../i18n/cs'

export function SignupPage() {
  const { dishId } = useParams<{ dishId: string }>()
  const navigate = useNavigate()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [portions, setPortions] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signups, setSignups] = useState<Signup[]>([])

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p className="auth-loading" data-testid="signup-loading">
        {cs.common.loading}
      </p>
    )
  }

  const dish = week?.dishes.find((d) => d.id === Number(dishId)) ?? null
  if (!dish) {
    return <Navigate to="/" replace />
  }

  // Calendar starts from the earlier of today or blockStart so block days are
  // always visible; past block days are shown but still selectable (BR-2 enforced by API).
  const todayPrague = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(
    new Date(),
  )
  const calStart = todayPrague < dish.start_date ? todayPrague : dish.start_date
  // Ensure we show enough days to always cover the full block end.
  const calEnd = addDays(calStart, 6)
  const startIso = calEnd >= dish.end_date ? calStart : dish.start_date

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (selectedDays.length === 0) {
      setError(cs.signup.noDay)
      return
    }
    if (selectedDays.some((d) => !isDayInBlock(d, dish!.start_date, dish!.end_date))) {
      setError(cs.signup.invalidDay)
      return
    }
    if (!isValidPortions(portions)) {
      setError(cs.signup.invalidPortions)
      return
    }
    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        selectedDays.map((day) => createSignup(dish!.id, day, portions)),
      )
      const created = results
        .filter((r): r is PromiseFulfilledResult<Signup> => r.status === 'fulfilled')
        .map((r) => r.value)
      setSignups(created)
      if (created.length < selectedDays.length) {
        const failed = selectedDays.length - created.length
        setError(
          failed === selectedDays.length
            ? cs.common.genericError
            : `${created.length} z ${selectedDays.length} přihlášek proběhlo, ${failed} selhalo.`,
        )
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 422
          ? cs.signup.invalidDay
          : cs.common.genericError,
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function onCancel() {
    if (signups.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await Promise.all(signups.map((s) => cancelSignup(s.id)))
      setSignups([])
      setSelectedDays([])
    } catch {
      setError(cs.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  const n = selectedDays.length
  const submitLabel =
    n > 1 ? `${cs.signup.submit} (${n} ${n === 1 ? 'den' : 'dní'})` : cs.signup.submit

  return (
    <main className="screen" data-testid="signup">
      <div className="screen-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          {cs.common.back}
        </button>
        <ThemeToggle />
      </div>

      <h1>{cs.signup.title}</h1>
      <h2>{dish.name}</h2>

      <form onSubmit={onSubmit} noValidate>
        <fieldset className="field">
          <legend>{cs.signup.pickDay}</legend>
          <WeekCalendar
            startIso={startIso}
            blockStart={dish.start_date}
            blockEnd={dish.end_date}
            selected={selectedDays}
            onToggle={toggleDay}
          />
        </fieldset>

        <label className="field">
          <span>{cs.signup.portionsLabel}</span>
          <input
            data-testid="signup-portions"
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
          />
        </label>

        {error && (
          <p data-testid="signup-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        {signups.length > 0 && (
          <p data-testid="signup-confirmed">{cs.signup.signedUp}</p>
        )}
        <button data-testid="signup-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : submitLabel}
        </button>
      </form>

      {signups.length > 0 && (
        <button
          data-testid="signup-cancel"
          type="button"
          className="danger"
          onClick={onCancel}
          disabled={submitting}
        >
          {signups.length === 1 ? cs.signup.cancel : cs.signup.cancelAll}
        </button>
      )}
    </main>
  )
}
