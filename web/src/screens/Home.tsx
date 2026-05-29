// Protected landing. A placeholder until the real "This week" screen lands
// (§14.3, T-7.3); for now it confirms the session, offers logout, and — for the
// admin or the week's chooser — links to the add-dish form (AC-5 hides it from
// other members).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { getCurrentWeek } from '../api/weeks'
import type { Week } from '../api/types'
import { canPropose } from '../domain/dishBlock'
import { cs } from '../i18n/cs'
import { useAuth } from '../auth/useAuth'

export function Home() {
  const navigate = useNavigate()
  const { me, setMe } = useAuth()
  const [week, setWeek] = useState<Week | null>(null)

  useEffect(() => {
    getCurrentWeek()
      .then(setWeek)
      .catch(() => setWeek(null))
  }, [])

  async function onLogout() {
    await logout()
    setMe(null)
    navigate('/login', { replace: true })
  }

  return (
    <main className="screen" data-testid="home">
      <p>
        {cs.home.loggedInAs} <strong>{me?.name}</strong>
      </p>
      <p>{cs.home.placeholder}</p>
      {canPropose(me, week) && (
        <Link data-testid="action-propose-dish" to="/dishes/new">
          {cs.dish.addAction}
        </Link>
      )}
      <button data-testid="logout" type="button" onClick={onLogout}>
        {cs.home.logout}
      </button>
    </main>
  )
}
