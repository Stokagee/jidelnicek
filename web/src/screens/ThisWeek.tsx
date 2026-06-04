// "This week" — the protected landing and navigation hub (§14.3), extended into
// a 30-day browser (#80). It lists dishes for a selected week (◀ ▶ paging within
// the next 30 days) or shows a month grid of those days; each dish links to its
// signup screen, and — for the admin/chooser, or anyone when open choosing is on
// — an empty day links to planning a dish for that date. The current week's
// chooser banner, the add-dish action (AC-5), and the cook-summary link are kept.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { getDishes } from '../api/dishes'
import { getSettings } from '../api/settings'
import { getCurrentWeek } from '../api/weeks'
import type { DishWithSignups, Week } from '../api/types'
import { ThemeToggle } from '../components/ThemeToggle'
import { canEdit, canPropose } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { useAuth } from '../auth/useAuth'
import { addDays, formatDayMonthRange, mondayOf, todayPrague } from '../utils/dates'

const HORIZON_DAYS = 30

export function ThisWeek() {
  const navigate = useNavigate()
  const { me, setMe } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [windowDishes, setWindowDishes] = useState<DishWithSignups[]>([])
  const [openChoosing, setOpenChoosing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [offset, setOffset] = useState(0)

  const windowStart = todayPrague()
  const windowEnd = addDays(windowStart, HORIZON_DAYS)

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
    // #77: when the button is on, everyone gets the add-dish action.
    getSettings()
      .then((s) => setOpenChoosing(s.open_choosing))
      .catch(() => setOpenChoosing(false))
    // #80: dishes across the whole window feed the week paging + month grid.
    getDishes(windowStart, windowEnd)
      .then(setWindowDishes)
      .catch(() => setWindowDishes([]))
  }, [windowStart, windowEnd])

  async function onLogout() {
    await logout()
    setMe(null)
    navigate('/login', { replace: true })
  }

  // Mondays of every week intersecting [today, today+30] (#80).
  const weekMondays = useMemo(() => {
    const list: string[] = []
    const last = mondayOf(windowEnd)
    for (let m = mondayOf(windowStart); m <= last; m = addDays(m, 7)) list.push(m)
    return list
  }, [windowStart, windowEnd])

  // Range data merged with the current week (kept resilient if /dishes fails: the
  // current week still renders from /weeks/current). Unique by id.
  const allDishes = useMemo(() => {
    const byId = new Map<number, DishWithSignups>()
    for (const d of windowDishes) byId.set(d.id, d)
    for (const d of week?.dishes ?? []) byId.set(d.id, d)
    return [...byId.values()]
  }, [windowDishes, week])

  const safeOffset = Math.min(Math.max(offset, 0), Math.max(weekMondays.length - 1, 0))
  const selectedMonday = weekMondays[safeOffset] ?? mondayOf(windowStart)
  const selectedSunday = addDays(selectedMonday, 6)

  const dishesOn = (day: string): DishWithSignups[] =>
    allDishes.filter((d) => d.start_date <= day && d.end_date >= day)

  const weekDishes = allDishes
    .filter((d) => d.start_date <= selectedSunday && d.end_date >= selectedMonday)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : a.id - b.id))

  const canAdd = openChoosing || canPropose(me, week)

  const monthDays = useMemo(() => {
    if (weekMondays.length === 0) return []
    const days: string[] = []
    const end = addDays(weekMondays[weekMondays.length - 1], 6)
    for (let d = weekMondays[0]; d <= end; d = addDays(d, 1)) days.push(d)
    return days
  }, [weekMondays])

  return (
    <main className="screen" data-testid="this-week">
      <header className="screen-header">
        <p>
          {cs.home.loggedInAs} <strong>{me?.name}</strong>
        </p>
        <div className="header-actions">
          <ThemeToggle />
          <button data-testid="logout" type="button" onClick={onLogout}>
            {cs.home.logout}
          </button>
        </div>
      </header>

      <h1>{cs.thisWeek.title}</h1>

      {/* Show the chooser their assigned days */}
      {week && me && !me.is_admin && week.chooser_id === me.id && week.chooser_start_date && (
        <p className="chooser-days-info" data-testid="chooser-days-info">
          {cs.thisWeek.yourDays}{' '}
          <strong>
            {formatDayMonthRange(
              week.chooser_start_date,
              week.chooser_end_date ?? week.chooser_start_date,
            )}
          </strong>
        </p>
      )}

      <nav className="actions">
        {me?.is_admin && (
          <Link data-testid="link-cook-summary" to="/cook-summary">
            {cs.thisWeek.cookSummaryLink}
          </Link>
        )}
        {canAdd && (
          <Link data-testid="action-propose-dish" to="/dishes/new">
            {cs.dish.addAction}
          </Link>
        )}
      </nav>

      {/* #80: switch between the week list and the 30-day month grid. */}
      <div className="view-toggle" role="group" aria-label={cs.thisWeek.title}>
        <button
          type="button"
          data-testid="view-week"
          aria-pressed={view === 'week'}
          onClick={() => setView('week')}
        >
          {cs.thisWeek.viewWeek}
        </button>
        <button
          type="button"
          data-testid="view-month"
          aria-pressed={view === 'month'}
          onClick={() => setView('month')}
        >
          {cs.thisWeek.viewMonth}
        </button>
      </div>

      {loading ? (
        <p data-testid="week-loading">{cs.common.loading}</p>
      ) : view === 'month' ? (
        <section className="month" data-testid="month-grid">
          <p className="month-title">{cs.thisWeek.monthTitle}</p>
          <div className="month-grid">
            {cs.days.short.map((d) => (
              <span key={`mh-${d}`} className="wc-header">
                {d}
              </span>
            ))}
            {monthDays.map((day) => {
              const onDay = dishesOn(day)
              const inWindow = day >= windowStart && day <= windowEnd
              let cls = 'month-day'
              if (!inWindow) cls += ' month-day--out'
              if (onDay.length > 0) cls += ' month-day--has-dish'
              if (onDay.length > 0) {
                return (
                  <Link
                    key={day}
                    to={`/dishes/${onDay[0].id}/signup`}
                    className={cls}
                    data-testid={`day-${day}`}
                    title={onDay.map((x) => x.name).join(', ')}
                  >
                    {Number(day.slice(8))}
                  </Link>
                )
              }
              if (inWindow && canAdd) {
                return (
                  <Link
                    key={day}
                    to={`/dishes/new?date=${day}`}
                    className={cls}
                    data-testid={`day-${day}-add`}
                    title={cs.thisWeek.addOnDay}
                  >
                    {Number(day.slice(8))}
                  </Link>
                )
              }
              return (
                <span key={day} className={cls}>
                  {Number(day.slice(8))}
                </span>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="week-view">
          <div className="week-pager">
            <button
              type="button"
              data-testid="week-prev"
              aria-label={cs.thisWeek.prevWeek}
              disabled={safeOffset === 0}
              onClick={() => setOffset((o) => Math.max(o - 1, 0))}
            >
              ◀
            </button>
            <span data-testid="week-label">
              {formatDayMonthRange(selectedMonday, selectedSunday)}
            </span>
            <button
              type="button"
              data-testid="week-next"
              aria-label={cs.thisWeek.nextWeek}
              disabled={safeOffset >= weekMondays.length - 1}
              onClick={() => setOffset((o) => Math.min(o + 1, weekMondays.length - 1))}
            >
              ▶
            </button>
          </div>

          {weekDishes.length === 0 ? (
            <p data-testid="week-empty">{cs.thisWeek.empty}</p>
          ) : (
            <ul className="dish-list">
              {weekDishes.map((dish) => (
                <li key={dish.id} data-testid={`dish-${dish.id}`}>
                  <span className="dish-name">{dish.name}</span>
                  <span className="dish-block">
                    {formatDayMonthRange(dish.start_date, dish.end_date)}
                  </span>
                  <Link data-testid={`dish-${dish.id}-signup`} to={`/dishes/${dish.id}/signup`}>
                    {cs.thisWeek.signup}
                  </Link>
                  {canEdit(me, dish) && (
                    <Link data-testid={`dish-${dish.id}-edit`} to={`/dishes/${dish.id}/edit`}>
                      {cs.thisWeek.edit}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
