// Single source of identity for the app. The protected layout checks /me once on
// mount and caches it (frontend skill rule 1); screens read it via useAuth/useMe.
// The session lives in the httpOnly cookie, so there is nothing to persist here.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getMe } from '../api/auth'
import { ApiError } from '../api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Awaited<ReturnType<typeof getMe>> | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setMe(await getMe())
    } catch (err) {
      // 401 = no/expired session; any other failure also leaves us logged out
      // rather than crashing the shell (the guard will route to /login).
      if (!(err instanceof ApiError)) {
        // network/other errors are handled the same way; nothing actionable here
      }
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <AuthContext.Provider value={{ me, loading, setMe, reload }}>{children}</AuthContext.Provider>
  )
}
