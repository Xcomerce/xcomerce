import { getDashboardForRole, type UserRole } from '@keve/shared'
import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/contexts/auth-context'

function RoleShell({ role }: { role: UserRole }) {
  return <AppShell role={role} />
}

export function BuyerAppLayout() {
  return <RoleShell role="buyer" />
}

export function SupplierAppLayout() {
  return <RoleShell role="supplier" />
}

export function AdminAppLayout() {
  return <RoleShell role="admin" />
}

export function ActiveRoleAppLayout() {
  const { activeRole, roles, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!activeRole) {
    if (roles.length > 1) return <Navigate to="/auth/select-role" replace />
    if (roles[0]) return <Navigate to={getDashboardForRole(roles[0])} replace />
    return <Navigate to="/auth/login" replace />
  }

  const shellRole = activeRole === 'commercial' ? 'admin' : activeRole
  return <AppShell role={shellRole} />
}
