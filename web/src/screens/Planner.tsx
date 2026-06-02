// 30-day planner (#77, #80). Shows the next 30 days, each with a lunch and a
// dinner cell. When open-choosing is on, any logged-in user may fill an empty
// (day, slot) cell with a dish; the server enforces one dish per (day, slot) and
// derives/creates the week. A filled cell links to signup (and edit, if allowed).
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DishWithSignups } from '../api/types'
import { createOpenDish, getDishes } from '../api/dishes'
import { getSettings } from '../api/settings'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../auth/useAuth'
import { canEdit } from '../domain/dishBlock'
import { dishErrorMessage } from '../dishes/dishErrors'
import { cs } from '../i18n/cs'
import { addDays, formatDayMonth } from '../utils/dates'

const HORIZON_DAYS = 30
const SLOTS = ['lunch', 'dinner'] as const
type Slot = (typeof SLOTS)[number]

function todayPrague(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(new Date())
}

function dayAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][dt.getUTCDay()]
}

function slotLabel(slot: Slot): string {
  return slot === 'lunch' ? cs.dish.slotLunch : cs.dish.slotDinner
}

function dishAt(dishes: DishWithSignups[], day: string, slot: Slot): DishWithSignups | null {
  return (
    dishes.find((d) => d.slot === slot && d.start_date <= day && day <= d.end_date) ?? null
  )
}

export function Planner() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const [dishes, setDishes] = useState<DishWithSignups[]>([])
  const [openChoosing, setOpenChoosing] = useState(false)
  const [loading, setLoading] = useState(true)

  // At most one cell has its add-form open at a time, keyed `${day}|${slot}`.
  const [addKey, setAddKey] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const today = todayPrague()
  const days = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i))

  const loadDishes = useCallback(() => {
    return getDishes(today, addDays(today, HORIZON_DAYS - 1))
      .then(setDishes)
      .catch(() => setDishes([]))
  }, [today])

  useEffect(() => {
    Promise.all([
      getSettings()
        .then((s) => s.open_choosing)
        .catch(() => false),
      loadDishes(),
    ])
      .then(([open]) => setOpenChoosing(open))
      .finally(() => setLoading(false))
  }, [loadDishes])

  function openAdd(day: string, slot: Slot) {
    setAddKey(`${day}|${slot}`)
    setAddName('')
    setAddError(null)
  }

  async function confirmAdd(day: string, slot: Slot) {
    if (!addName.trim()) return
    setSaving(true)
    setAddError(null)
    try {
      await createOpenDish({ name: addName.trim(), start_date: day, end_date: day, slot })
      await loadDishes()
      setAddKey(null)
      setAddName('')
    } catch (err) {
      setAddError(dishErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="auth-loading" data-testid="planner-loading">
        {cs.planner.loading}
      </p>
    )
  }

  return (
    <main className="screen" data-testid="planner">
      <div className="screen-header">
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          {cs.common.back}
        </button>
        <ThemeToggle />
      </div>

      <h1>{cs.planner.title}</h1>
      <p className="planner-intro">{openChoosing ? cs.planner.intro : cs.planner.closedNote}</p>

      <table className="planner-table">
        <thead>
          <tr>
            <th />
            {SLOTS.map((slot) => (
              <th key={slot}>{slotLabel(slot)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} data-testid={`planner-day-${day}`}>
              <th scope="row" className="planner-day-label">
                <span className="planner-day-abbr">{dayAbbr(day)}</span>{' '}
                <span className="planner-day-date">{formatDayMonth(day)}</span>
              </th>
              {SLOTS.map((slot) => {
                const dish = dishAt(dishes, day, slot)
                const cellKey = `${day}|${slot}`
                return (
                  <td key={slot} data-testid={`cell-${day}-${slot}`}>
                    {dish ? (
                      <div className="planner-cell-filled">
                        <span className="dish-name" data-testid={`planner-dish-${dish.id}`}>
                          {dish.name}
                        </span>
                        <Link
                          data-testid={`planner-signup-${dish.id}`}
                          to={`/dishes/${dish.id}/signup`}
                        >
                          {cs.planner.signup}
                        </Link>
                        {canEdit(me, dish) && (
                          <Link
                            data-testid={`planner-edit-${dish.id}`}
                            to={`/dishes/${dish.id}/edit`}
                          >
                            {cs.planner.edit}
                          </Link>
                        )}
                      </div>
                    ) : !openChoosing ? (
                      <span className="planner-empty">{cs.cookSummary.noSignups}</span>
                    ) : addKey === cellKey ? (
                      <div className="planner-add-form">
                        <input
                          data-testid={`add-name-${day}-${slot}`}
                          value={addName}
                          placeholder={cs.planner.addPlaceholder}
                          autoFocus
                          onChange={(e) => setAddName(e.target.value)}
                        />
                        <button
                          type="button"
                          data-testid={`add-confirm-${day}-${slot}`}
                          disabled={saving || !addName.trim()}
                          onClick={() => confirmAdd(day, slot)}
                        >
                          {cs.planner.addConfirm}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setAddKey(null)}
                        >
                          {cs.planner.addCancel}
                        </button>
                        {addError && (
                          <span
                            className="planner-add-error"
                            role="alert"
                            data-testid={`add-error-${day}-${slot}`}
                          >
                            {addError}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="planner-add"
                        data-testid={`add-${day}-${slot}`}
                        onClick={() => openAdd(day, slot)}
                      >
                        {cs.planner.addAction}
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
