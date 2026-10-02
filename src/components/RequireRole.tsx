import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../lib/auth'

interface RequireRoleProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && !allowedRoles.includes(role)) {
    const redirectTo = role === 'ADMIN' ? '/manager' : '/worker'
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}