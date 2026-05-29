// Create-dish route (§14.5 "založit jídlo", FR-D1/FR-D2). Self-contained at
// /dishes/new until the cook summary host lands (T-7.3). Loads the current week
// for the block bounds + the BR-6 permission check; a non-chooser member is sent
// back to the home (the add-dish action is also hidden there — AC-5).
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { Week } from '../api/types'
import { createDish } from '../api/dishes'
import { getCurrentWeek } from '../api/weeks'
import { useAuth } from '../auth/useAuth'
import { canPropose, isValidBlock } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { DishForm, type DishFormValues } from './DishForm'
import { dishErrorMessage } from './dishErrors'
import { weekRange } from './weekRange'

export function CreateDish() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p className="auth-loading" data-testid="dish-loading">
        {cs.common.loading}
      </p>
    )
  }
  if (!week || !canPropose(me, week)) {
    return <Navigate to="/" replace />
  }

  const { min, max } = weekRange(week.start_date)
  const todayPrague = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(
    new Date(),
  )

  async function onSubmit(values: DishFormValues) {
    setError(null)
    if (!isValidBlock(values.start_date, values.end_date)) {
      setError(cs.dish.invalidBlock)
      return
    }
    setSubmitting(true)
    try {
      await createDish(week!.id, values)
      navigate('/', { replace: true })
    } catch (err) {
      setError(dishErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DishForm
      title={cs.dish.createTitle}
      startIso={todayPrague}
      minDate={min}
      maxDate={max}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      onBack={() => navigate(-1)}
    />
  )
}
