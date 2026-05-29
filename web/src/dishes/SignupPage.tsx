// Signup screen (§14.4, FR-S1/FR-S2/FR-S4/FR-S5). Reached at /dishes/:id/signup
// from the dish in "This week". Pick a day inside the dish block + portions and
// sign up; the just-created signup can then be cancelled in-session (there is no
// GET to rehydrate existing signups). data-testid hooks match the Robot
// page-object (dish_signup_page.resource).
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import type { Signup, Week } from '../api/types'
import { ApiError } from '../api/client'
import { cancelSignup, createSignup } from '../api/signups'
import { getCurrentWeek } from '../api/weeks'
import { daysInBlock, isDayInBlock } from '../domain/block'
import { isValidPortions } from '../domain/portions'
import { cs } from '../i18n/cs'

export function SignupPage() {
  const { dishId } = useParams<{ dishId: string }>()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [portions, setPortions] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signup, setSignup] = useState<Signup | null>(null)

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

  const days = daysInBlock(dish.start_date, dish.end_date)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!selectedDay) {
      setError(cs.signup.noDay)
      return
    }
    if (!isDayInBlock(selectedDay, dish!.start_date, dish!.end_date)) {
      setError(cs.signup.invalidDay)
      return
    }
    if (!isValidPortions(portions)) {
      setError(cs.signup.invalidPortions)
      return
    }
    setSubmitting(true)
    try {
      setSignup(await createSignup(dish!.id, selectedDay, portions))
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
    if (!signup) return
    setSubmitting(true)
    setError(null)
    try {
      await cancelSignup(signup.id)
      setSignup(null)
    } catch {
      setError(cs.common.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="screen" data-testid="signup">
      <h1>{cs.signup.title}</h1>
      <h2>{dish.name}</h2>
      <form onSubmit={onSubmit} noValidate>
        <fieldset className="field">
          <legend>{cs.signup.pickDay}</legend>
          <div className="day-grid">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                data-testid={`day-${day}`}
                aria-pressed={selectedDay === day}
                className={selectedDay === day ? 'day selected' : 'day'}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
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
        {signup && <p data-testid="signup-confirmed">{cs.signup.signedUp}</p>}
        <button data-testid="signup-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : cs.signup.submit}
        </button>
      </form>
      {signup && (
        <button
          data-testid="signup-cancel"
          type="button"
          className="danger"
          onClick={onCancel}
          disabled={submitting}
        >
          {cs.signup.cancel}
        </button>
      )}
    </main>
  )
}
