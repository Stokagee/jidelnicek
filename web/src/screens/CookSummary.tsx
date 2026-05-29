// Cook summary, admin only (§14.5, FR-K1/FR-K2/FR-K3, AC-4). For the selected day
// of the week it shows per-dish active-portion totals (including the admin's own)
// from GET /summary. Also offers the create-dish action; the set-chooser action
// waits on the members endpoint (#53). Non-admins are redirected home.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import type { DishPortions, Week } from '../api/types'
import { getSummary } from '../api/summary'
import { getCurrentWeek } from '../api/weeks'
import { useAuth } from '../auth/useAuth'
import { daysInBlock } from '../domain/block'
import { weekRange } from '../dishes/weekRange'
import { cs } from '../i18n/cs'

export function CookSummary() {
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [rows, setRows] = useState<DishPortions[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    getCurrentWeek()
      .then((w) => {
        setWeek(w)
        setSelectedDay(weekRange(w.start_date).min)
      })
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!week || !selectedDay) return
    setSummaryLoading(true)
    getSummary(week.id, selectedDay)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setSummaryLoading(false))
  }, [week, selectedDay])

  // Admin-only view (FR-K1). me is guaranteed present inside the protected layout.
  if (!me?.is_admin) {
    return <Navigate to="/" replace />
  }
  if (loading || !week) {
    return (
      <p className="auth-loading" data-testid="summary-loading">
        {cs.common.loading}
      </p>
    )
  }

  const { min, max } = weekRange(week.start_date)
  const days = daysInBlock(min, max)

  return (
    <main className="screen" data-testid="cook-summary">
      <h1>{cs.cookSummary.title}</h1>

      <Link data-testid="action-create-dish" to="/dishes/new">
        {cs.cookSummary.createDish}
      </Link>

      <div className="day-grid" role="group" aria-label={cs.cookSummary.dayLabel}>
        {days.map((day) => (
          <button
            key={day}
            type="button"
            data-testid={`summary-day-${day}`}
            aria-pressed={selectedDay === day}
            className={selectedDay === day ? 'day selected' : 'day'}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {summaryLoading ? (
        <p>{cs.common.loading}</p>
      ) : rows.length === 0 ? (
        <p data-testid="summary-empty">{cs.cookSummary.noSignups}</p>
      ) : (
        <ul className="summary-list">
          {rows.map((row) => (
            <li key={row.dish_id} data-testid={`summary-${selectedDay}-${row.dish_id}`}>
              {row.portions}
              {cs.cookSummary.portionsUnit} {row.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
