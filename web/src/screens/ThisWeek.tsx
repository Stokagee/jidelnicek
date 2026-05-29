// "This week" — the protected landing and navigation hub (§14.3). Lists the
// week's dishes and links each to its signup screen; the admin/chooser also gets
// the add-dish action (AC-5) and edit links, and the admin a link to the cook
// summary. The per-dish "who is signed up / portion total" (§14.3) arrives once
// the BE exposes member-facing signup data (#53); until then this lists dishes.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { getCurrentWeek } from '../api/weeks'
import type { Week } from '../api/types'
import { canEdit, canPropose } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { useAuth } from '../auth/useAuth'

export function ThisWeek() {
  const navigate = useNavigate()
  const { me, setMe } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
      .finally(() => setLoading(false))
  }, [])

  async function onLogout() {
    await logout()
    setMe(null)
    navigate('/login', { replace: true })
  }

  const dishes = week?.dishes ?? []

  return (
    <main className="screen" data-testid="this-week">
      <header className="screen-header">
        <p>
          {cs.home.loggedInAs} <strong>{me?.name}</strong>
        </p>
        <button data-testid="logout" type="button" onClick={onLogout}>
          {cs.home.logout}
        </button>
      </header>

      <h1>{cs.thisWeek.title}</h1>

      <nav className="actions">
        {me?.is_admin && (
          <Link data-testid="link-cook-summary" to="/cook-summary">
            {cs.thisWeek.cookSummaryLink}
          </Link>
        )}
        {canPropose(me, week) && (
          <Link data-testid="action-propose-dish" to="/dishes/new">
            {cs.dish.addAction}
          </Link>
        )}
      </nav>

      {loading ? (
        <p data-testid="week-loading">{cs.common.loading}</p>
      ) : dishes.length === 0 ? (
        <p data-testid="week-empty">{cs.thisWeek.empty}</p>
      ) : (
        <ul className="dish-list">
          {dishes.map((dish) => (
            <li key={dish.id} data-testid={`dish-${dish.id}`}>
              <span className="dish-name">{dish.name}</span>
              <span className="dish-block">
                {dish.start_date} – {dish.end_date}
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
    </main>
  )
}
