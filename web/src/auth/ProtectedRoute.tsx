// Route guard: every screen except /login and /claim/:token sits behind this.
// While /me is in flight we hold; once resolved, an unauthenticated visitor is
// redirected to /login (FR-A5). Authenticated visitors get the nested routes.
import { Navigate, Outlet } from 'react-router-dom'
import { cs } from '../i18n/cs'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { me, loading } = useAuth()
  if (loading) {
    return (
      <p className="auth-loading" data-testid="auth-loading">
        {cs.common.loading}
      </p>
    )
  }
  if (!me) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
