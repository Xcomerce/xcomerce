import { useEffect } from 'react'
import { getDashboardForRole, type UserRole } from '@keve/shared'
import { Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/contexts/auth-context'

function RoleShell({ role }: { role: UserRole }) {
  return <AppShell role={role} />
}

function useSyncActiveRole(role: UserRole) {
  const { roles, setActiveRole } = useAuth()

  useEffect(() => {
    if (roles.includes(role)) setActiveRole(role)
  }, [role, roles, setActiveRole])
}

export function BuyerAppLayout() {
  useSyncActiveRole('buyer')
  return <RoleShell role="buyer" />
}

export function SupplierAppLayout() {
  useSyncActiveRole('supplier')
  return <RoleShell role="supplier" />
}

export function AdminAppLayout() {
  const { roles, setActiveRole } = useAuth()

  useEffect(() => {
    const staffRole = roles.find((role) => role === 'admin' || role === 'commercial')
    if (staffRole) setActiveRole(staffRole)
  }, [roles, setActiveRole])

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
