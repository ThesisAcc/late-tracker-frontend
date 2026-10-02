import { useMemo } from 'react'
import { getAuthUser, type AuthenticatedUser, type UserRole, isAdmin, isEmployee } from '../lib/auth'

export function useAuth() {
  const user = useMemo(() => getAuthUser(), [])

  return {
    user,
    isAuthenticated: user !== null,
    isAdmin: isAdmin(user),
    isEmployee: isEmployee(user),
    role: user?.role ?? null,
  } as const
}

export type { AuthenticatedUser, UserRole }
export { isAdmin, isEmployee }