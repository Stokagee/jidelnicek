import { useContext } from 'react'
import type { Me } from '../api/types'
import { AuthContext, type AuthState } from './auth-context'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** Convenience accessor for just the current identity (frontend skill: useMe). */
export function useMe(): Me | null {
  return useAuth().me
}
