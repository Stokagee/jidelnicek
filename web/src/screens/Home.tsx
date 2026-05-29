// Protected landing. A placeholder until the real "This week" screen lands
// (§14.3, T-7.3); for now it confirms the authenticated session and offers
// logout, which exercises the route guard end-to-end.
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { cs } from '../i18n/cs'
import { useAuth } from '../auth/useAuth'

export function Home() {
  const navigate = useNavigate()
  const { me, setMe } = useAuth()

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
      <button data-testid="logout" type="button" onClick={onLogout}>
        {cs.home.logout}
      </button>
    </main>
  )
}
