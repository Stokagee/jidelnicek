// Create-dish route (§14.5 "založit jídlo", FR-D1/FR-D2). Self-contained at
// /dishes/new until the cook summary host lands (T-7.3). Loads the current week
// for the block bounds + the BR-6 permission check; a non-chooser member is sent
// back to the home (the add-dish action is also hidden there — AC-5).
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { Week } from '../api/types'
import { createDish, createPlannedDish } from '../api/dishes'
import { getSettings } from '../api/settings'
import { getCurrentWeek } from '../api/weeks'
import { useAuth } from '../auth/useAuth'
import { canPropose } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { addDays, mondayOf } from '../utils/dates'
import { DishForm, type DishFormValues } from './DishForm'
import { dishErrorMessage } from './dishErrors'
import { validateDishForm } from './validateDishForm'
import { weekRange } from './weekRange'

export function CreateDish() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // #80: planning a dish for a specific future day (from the month/week browser).
  const presetDate = params.get('date')
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [openChoosing, setOpenChoosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      getCurrentWeek().catch((): Week | null => null),
      getSettings()
        .then((s) => s.open_choosing)
        .catch(() => false),
    ])
      .then(([w, open]) => {
        setWeek(w)
        setOpenChoosing(open)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p className="auth-loading" data-testid="dish-loading">
        {cs.common.loading}
      </p>
    )
  }
  // #77: when open choosing is on, anyone may create; otherwise BR-6 (admin/chooser).
  if (!week || (!openChoosing && !canPropose(me, week))) {
    return <Navigate to="/" replace />
  }

  const { min, max } = weekRange(week.start_date)
  const todayPrague = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(
    new Date(),
  )

  async function onSubmit(values: DishFormValues) {
    setError(null)
    const validationError = validateDishForm(values) // #79: required fields before POST.
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      // #80: a preset date plans by date (no week_id — the API derives the week and
      // enforces the 30-day horizon); otherwise the current-week by-id path.
      if (presetDate) {
        await createPlannedDish(values)
      } else {
        await createDish(week!.id, values)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(dishErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // If the logged-in user is the chooser (not admin), restrict the block picker
  // to their assigned days so they can only propose dishes on their days.
  const isChooser = !me?.is_admin && week.chooser_id === me?.id
  const chooserStart = isChooser ? (week.chooser_start_date ?? null) : null
  const chooserEnd = isChooser ? (week.chooser_end_date ?? null) : null

  // #80: when planning a specific day, the picker starts there and is locked to
  // that day's ISO week (the API rejects a block spanning two weeks).
  const allowedStart = presetDate ?? chooserStart
  const allowedEnd = presetDate ? addDays(mondayOf(presetDate), 6) : chooserEnd
  const startIso = presetDate ?? (isChooser && chooserStart ? chooserStart : todayPrague)

  return (
    <DishForm
      title={cs.dish.createTitle}
      startIso={startIso}
      minDate={min}
      maxDate={max}
      allowedStart={allowedStart}
      allowedEnd={allowedEnd}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      onBack={() => navigate(-1)}
    />
  )
}
