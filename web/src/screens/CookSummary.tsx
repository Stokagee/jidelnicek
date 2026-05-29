// Cook summary, admin only (§14.5, FR-K1/FR-K2/FR-K3, AC-4). For the selected day
// of the week it shows per-dish active-portion totals from GET /summary. Also
// offers create-dish and set-chooser (FR-W2/FR-W3). Non-admins are redirected home.
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { DishPortions, User, Week } from '../api/types'
import { getUsers } from '../api/auth'
import { getSummary } from '../api/summary'
import { getCurrentWeek, setChooser } from '../api/weeks'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../auth/useAuth'
import { daysInBlock } from '../domain/block'
import { weekRange } from '../dishes/weekRange'
import { cs } from '../i18n/cs'

export function CookSummary() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [rows, setRows] = useState<DishPortions[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [pendingChooserId, setPendingChooserId] = useState<number | ''>('')
  const [chooserSaved, setChooserSaved] = useState(false)
  const [chooserError, setChooserError] = useState<string | null>(null)
  const [chooserSaving, setChooserSaving] = useState(false)

  useEffect(() => {
    Promise.all([getCurrentWeek(), getUsers().catch((): User[] => [])])
      .then(([w, us]) => {
        setWeek(w)
        setUsers(us)
        setPendingChooserId(w.chooser_id ?? '')
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

  async function onSaveChooser() {
    if (!week || pendingChooserId === '') return
    setChooserSaving(true)
    setChooserSaved(false)
    setChooserError(null)
    try {
      const updated = await setChooser(week.id, Number(pendingChooserId))
      setWeek(updated)
      setPendingChooserId(updated.chooser_id ?? '')
      setChooserSaved(true)
    } catch {
      setChooserError(cs.common.genericError)
    } finally {
      setChooserSaving(false)
    }
  }

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
  const chooserName = users.find((u) => u.id === week.chooser_id)?.name

  return (
    <main className="screen" data-testid="cook-summary">
      <div className="screen-header">
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          {cs.common.back}
        </button>
        <ThemeToggle />
      </div>

      <h1>{cs.cookSummary.title}</h1>

      <Link data-testid="action-create-dish" to="/dishes/new">
        {cs.cookSummary.createDish}
      </Link>

      {/* FR-W2/FR-W3: admin sets/changes the week's chooser (T-4.3). */}
      <section data-testid="chooser-section">
        <p data-testid="chooser-current">
          {cs.cookSummary.chooser.currentLabel}{' '}
          <strong>
            {chooserName ??
              (week.chooser_id != null
                ? cs.cookSummary.chooser.unknown
                : cs.cookSummary.chooser.notSet)}
          </strong>
        </p>
        <div className="chooser-row">
          <select
            data-testid="chooser-select"
            value={pendingChooserId}
            onChange={(e) => {
              setPendingChooserId(e.target.value === '' ? '' : Number(e.target.value))
              setChooserSaved(false)
            }}
          >
            <option value="" disabled>
              {cs.cookSummary.chooser.placeholder}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? cs.cookSummary.chooser.unknown}
              </option>
            ))}
          </select>
          <button
            data-testid="chooser-save"
            type="button"
            disabled={pendingChooserId === '' || chooserSaving}
            onClick={onSaveChooser}
          >
            {cs.cookSummary.chooser.saveButton}
          </button>
        </div>
        {chooserSaved && (
          <span className="chooser-feedback" data-testid="chooser-saved">
            {cs.cookSummary.chooser.saved}
          </span>
        )}
        {chooserError && (
          <span className="chooser-feedback" data-testid="chooser-error">
            {chooserError}
          </span>
        )}
      </section>

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
