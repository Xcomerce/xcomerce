import type { UserRole } from '../types/roles'

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  buyer: '/buyer/dashboard',
  supplier: '/supplier/board',
  commercial: '/admin/metrics',
  admin: '/admin/metrics',
}

export function getDashboardForRole(role: UserRole): string {
  return ROLE_DASHBOARD[role]
}
