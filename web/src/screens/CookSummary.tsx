// Cook summary, admin only (§14.5, FR-K1/FR-K2/FR-K3, AC-4).
// Shows all days of the current week as a table (dishes × days, portion totals
// computed from signups embedded in WeekResponse). The chooser section uses a
// two-step flow: pick person → click "Nastav" → day picker appears → confirm.
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { DishWithSignups, User, Week } from '../api/types'
import { getUsers } from '../api/auth'
import { getDishes } from '../api/dishes'
import { getSettings, setOpenChoosing } from '../api/settings'
import { getCurrentWeek, setChooser } from '../api/weeks'
import { BlockPicker } from '../components/BlockPicker'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../auth/useAuth'
import { addDays, formatDayMonth, formatDayMonthRange } from '../utils/dates'
import { cs } from '../i18n/cs'

function todayPrague(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
}

function dayAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][dt.getUTCDay()]
}

// #80: the cook plans for the next 30 days. #93: render it as a flat
// Day | Dish | Portions table (one row per day+dish with demand), not a sparse
// 30-column matrix.
const HORIZON_DAYS = 30

interface SummaryRow {
  day: string
  dishId: number
  dishName: string
  portions: number
}

/** One row per (day, dish) with portions ≥ 1 in [today, today+30], sorted by day
 *  then dish — "what and how much to cook" (FR-K1/FR-K2). */
function summaryRows(dishes: DishWithSignups[], today: string, end: string): SummaryRow[] {
  const rows: SummaryRow[] = []
  for (const dish of dishes) {
    const byDay = new Map<string, number>()
    for (const s of dish.signups) {
      if (s.day < today || s.day > end) continue
      byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.portions)
    }
    for (const [day, portions] of byDay) {
      if (portions >= 1) rows.push({ day, dishId: dish.id, dishName: dish.name, portions })
    }
  }
  return rows.sort((a, b) =>
    a.day !== b.day ? a.day.localeCompare(b.day) : a.dishName.localeCompare(b.dishName),
  )
}

export function CookSummary() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [dishes, setDishes] = useState<DishWithSignups[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // #77: open-choosing toggle (admin flips it here).
  const [openChoosing, setOpen] = useState(false)
  const [openSaving, setOpenSaving] = useState(false)

  // Chooser flow state
  const [pendingChooserId, setPendingChooserId] = useState<number | ''>('')
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [chooserDays, setChooserDays] = useState<string[]>([])
  const [chooserSaved, setChooserSaved] = useState(false)
  const [chooserError, setChooserError] = useState<string | null>(null)
  const [chooserSaving, setChooserSaving] = useState(false)

  useEffect(() => {
    const start = todayPrague()
    Promise.all([
      getCurrentWeek(),
      getUsers().catch((): User[] => []),
      getSettings()
        .then((s) => s.open_choosing)
        .catch(() => false),
      // #80: dishes across the whole 30-day window feed the summary table.
      getDishes(start, addDays(start, HORIZON_DAYS)).catch((): DishWithSignups[] => []),
    ])
      .then(([w, us, open, ds]) => {
        setWeek(w)
        setUsers(us)
        setOpen(open)
        setDishes(ds)
        setPendingChooserId(w.chooser_id ?? '')
        // Pre-fill chooser days from saved range
        if (w.chooser_start_date && w.chooser_end_date) {
          const days: string[] = []
          let cur = w.chooser_start_date
          while (cur <= w.chooser_end_date) {
            days.push(cur)
            cur = addDays(cur, 1)
          }
          setChooserDays(days)
        }
      })
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  async function onConfirmChooser() {
    if (!week || pendingChooserId === '') return
    setChooserSaving(true)
    setChooserSaved(false)
    setChooserError(null)
    const sorted = [...chooserDays].sort()
    try {
      const updated = await setChooser(
        week.id,
        Number(pendingChooserId),
        sorted[0] ?? null,
        sorted[sorted.length - 1] ?? null,
      )
      setWeek(updated)
      setChooserSaved(true)
      setShowDayPicker(false)
    } catch {
      setChooserError(cs.common.genericError)
    } finally {
      setChooserSaving(false)
    }
  }

  async function onToggleOpenChoosing(next: boolean) {
    setOpenSaving(true)
    try {
      const updated = await setOpenChoosing(next)
      setOpen(updated.open_choosing)
    } catch {
      // leave state unchanged on failure
    } finally {
      setOpenSaving(false)
    }
  }

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

  const chooserName = users.find((u) => u.id === week.chooser_id)?.name
  const today = todayPrague()
  const rows = summaryRows(dishes, today, addDays(today, HORIZON_DAYS))

  return (
    <main className="screen" data-testid="cook-summary">
      <div className="screen-header">
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          {cs.common.back}
        </button>
        <ThemeToggle />
      </div>

      <h1>{cs.cookSummary.title}</h1>

      <nav className="actions">
        <Link data-testid="action-create-dish" to="/dishes/new">
          {cs.cookSummary.createDish}
        </Link>
      </nav>

      {/* #77: one button that permanently lets everyone create dishes. */}
      <section className="open-choosing" data-testid="open-choosing-section">
        <button
          type="button"
          data-testid="open-choosing-button"
          disabled={openSaving}
          onClick={() => onToggleOpenChoosing(!openChoosing)}
        >
          {openChoosing
            ? cs.cookSummary.openChoosing.disable
            : cs.cookSummary.openChoosing.enable}
        </button>
        <p className="open-choosing-hint">{cs.cookSummary.openChoosing.hint}</p>
      </section>

      {/* #93: flat summary — one row per day+dish with demand in the next 30 days. */}
      <div className="week-table-wrap">
        <table className="week-table summary-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{cs.cookSummary.dayCol}</th>
              <th style={{ textAlign: 'left' }}>{cs.cookSummary.dishCol}</th>
              <th>{cs.cookSummary.portionsCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  data-testid="summary-empty"
                  colSpan={3}
                  style={{ textAlign: 'center', color: 'var(--c-text-muted)' }}
                >
                  {cs.cookSummary.noPortions}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.day}-${row.dishId}`} data-testid={`summary-${row.day}-${row.dishId}`}>
                  <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <strong>{dayAbbr(row.day)}</strong> <span>{formatDayMonth(row.day)}</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>{row.dishName}</td>
                  <td>
                    <span className="portions-badge">
                      {row.portions}
                      {cs.cookSummary.portionsUnit}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Chooser two-step flow */}
      <section className="chooser-flow" data-testid="chooser-section">
        <p data-testid="chooser-current">
          {cs.cookSummary.chooser.currentLabel}{' '}
          <strong>
            {chooserName ??
              (week.chooser_id != null
                ? cs.cookSummary.chooser.unknown
                : cs.cookSummary.chooser.notSet)}
          </strong>
          {week.chooser_start_date && week.chooser_end_date && (
            <span style={{ marginLeft: 8, fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
              ({formatDayMonthRange(week.chooser_start_date, week.chooser_end_date)})
            </span>
          )}
        </p>

        {/* Step 1: pick person */}
        <div className="chooser-trigger-row">
          <select
            data-testid="chooser-select"
            value={pendingChooserId}
            onChange={(e) => {
              setPendingChooserId(e.target.value === '' ? '' : Number(e.target.value))
              setShowDayPicker(false)
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
            disabled={pendingChooserId === ''}
            onClick={() => {
              setShowDayPicker(true)
              setChooserSaved(false)
            }}
          >
            {cs.cookSummary.chooser.setButton}
          </button>
        </div>

        {/* Step 2: pick days (appears after clicking "Nastav volitele") */}
        {showDayPicker && (
          <div className="chooser-day-step">
            <p>{cs.cookSummary.chooser.daysLabel}</p>
            <BlockPicker
              startIso={today}
              selectedDays={chooserDays}
              onToggle={(day) =>
                setChooserDays((prev) =>
                  prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                )
              }
            />
            <div className="chooser-confirm-row">
              <button
                data-testid="chooser-confirm"
                type="button"
                disabled={chooserSaving}
                onClick={onConfirmChooser}
              >
                {chooserSaving ? cs.common.loading : cs.cookSummary.chooser.confirmButton}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setShowDayPicker(false)}
              >
                {cs.cookSummary.chooser.cancelButton}
              </button>
            </div>
          </div>
        )}

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
    </main>
  )
}
