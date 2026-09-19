import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/auth/authService'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  children: ReactElement
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const session = authService.getSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(session.user.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}
