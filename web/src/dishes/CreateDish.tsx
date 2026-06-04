// Create-dish route (§14.5 "založit jídlo", FR-D1/FR-D2). Plans a dish anywhere in
// the next 30 days (#80): pick a day in the month grid (or arrive pre-targeted via
// ?date= from the This-week month view), then refine the block in a 7-day picker
// centred on that day. Submits by date (no week_id) — the API derives/auto-creates
// the week and enforces the horizon. A non-chooser member is sent home (AC-5).
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { Week } from '../api/types'
import { createPlannedDish } from '../api/dishes'
import { getSettings } from '../api/settings'
import { getCurrentWeek } from '../api/weeks'
import { useAuth } from '../auth/useAuth'
import { BlockPicker } from '../components/BlockPicker'
import { MonthDayPicker } from '../components/MonthDayPicker'
import { ThemeToggle } from '../components/ThemeToggle'
import { canPropose } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { addDays, mondayOf, todayPrague } from '../utils/dates'
import { dishErrorMessage } from './dishErrors'
import { validateDishForm } from './validateDishForm'

const HORIZON_DAYS = 30

export function CreateDish() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [openChoosing, setOpenChoosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const windowStart = todayPrague()
  const windowEnd = addDays(windowStart, HORIZON_DAYS)

  // The day being planned: a ?date deep-link (from the This-week month grid) when
  // it is inside the window, otherwise today.
  const presetDate = params.get('date')
  const initialDay =
    presetDate && presetDate >= windowStart && presetDate <= windowEnd ? presetDate : windowStart

  const [name, setName] = useState('')
  const [targetDay, setTargetDay] = useState(initialDay)
  const [selectedDays, setSelectedDays] = useState<string[]>([initialDay])

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
  // #77: open choosing lets anyone create; otherwise BR-6 (admin or current-week
  // chooser). The server re-checks against the resolved week, so planning into a
  // future week (no chooser) stays admin-only in closed mode.
  if (!openChoosing && !canPropose(me, week)) {
    return <Navigate to="/" replace />
  }

  function pickDay(day: string) {
    setTargetDay(day)
    setSelectedDays([day]) // #1: the picked day is selected straight away.
  }

  function toggleDay(day: string) {
    setSelectedDays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]))
  }

  const sorted = [...selectedDays].sort()
  const startDate = sorted[0] ?? ''
  const endDate = sorted[sorted.length - 1] ?? ''

  // #2: a 7-day picker centred on the target day (3 back + 3 forward). Selection
  // stays within the day's ISO week ∩ [today, today+30]; the rest is locked.
  const center = addDays(targetDay, -3)
  const weekMonday = mondayOf(targetDay)
  const weekSunday = addDays(weekMonday, 6)
  const allowedStart = weekMonday < windowStart ? windowStart : weekMonday
  const allowedEnd = weekSunday > windowEnd ? windowEnd : weekSunday

  async function onSubmit() {
    setError(null)
    const values = { name, start_date: startDate, end_date: endDate }
    const validationError = validateDishForm(values) // #79: required fields before POST.
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    try {
      await createPlannedDish(values) // #80: date-driven create (no week_id).
      navigate('/', { replace: true })
    } catch (err) {
      setError(dishErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="screen">
      <div className="screen-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          {cs.common.back}
        </button>
        <ThemeToggle />
      </div>
      <h1>{cs.dish.createTitle}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmit()
        }}
        noValidate
      >
        <label className="field">
          <span>{cs.dish.nameLabel}</span>
          <input
            data-testid="dish-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <div className="field">
          <span>{cs.dish.pickDayLabel}</span>
          <MonthDayPicker
            windowStart={windowStart}
            windowEnd={windowEnd}
            selected={targetDay}
            onSelect={pickDay}
          />
        </div>

        <div className="field">
          <span>{cs.dish.blockPickerLabel}</span>
          <BlockPicker
            startIso={center}
            selectedDays={selectedDays}
            onToggle={toggleDay}
            allowedStart={allowedStart}
            allowedEnd={allowedEnd}
          />
        </div>

        {error && (
          <p data-testid="dish-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button data-testid="dish-submit" type="submit" disabled={submitting}>
          {submitting ? cs.common.loading : cs.dish.submit}
        </button>
      </form>
    </main>
  )
}
