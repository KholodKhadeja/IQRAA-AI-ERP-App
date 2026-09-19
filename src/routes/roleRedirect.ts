import type { UserRole } from '../types/auth'

/**
 * Central map from role to landing dashboard. Keeping this in one place
 * means the dashboard implementations can change later without touching
 * the login flow.
 */
export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'Admin':
    case 'CEO':
    case 'VP':
      return '/dashboard/admin'
    case 'ProjectManager':
      return '/dashboard/project-manager'
    case 'Client':
      return '/dashboard/client'
  }
}
