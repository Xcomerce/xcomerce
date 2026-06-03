import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getDashboardForRole, type UserRole } from '@keve/shared'
import { useAuth } from '@/contexts/auth-context'

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location }} replace />
  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, roles, activeRole } = useAuth()

  if (isLoading) return <AuthLoading />
  if (isAuthenticated) {
    if (roles.length > 1 && !activeRole) return <Navigate to="/auth/select-role" replace />
    const role = activeRole ?? roles[0]
    if (role) return <Navigate to={getDashboardForRole(role)} replace />
    return <Navigate to="/auth/select-role" replace />
  }
  return <Outlet />
}

export function RoleRoute({ role, alsoAllow = [] }: { role: UserRole; alsoAllow?: UserRole[] }) {
  const { roles, isLoading, activeRole } = useAuth()
  const allowed = [role, ...alsoAllow]

  if (isLoading) return <AuthLoading />
  if (!roles.some((r) => allowed.includes(r))) {
    const fallback = activeRole ?? roles[0]
    return <Navigate to={fallback ? getDashboardForRole(fallback) : '/auth/select-role'} replace />
  }
  if (roles.length > 1 && activeRole && !allowed.includes(activeRole)) {
    return <Navigate to={getDashboardForRole(activeRole)} replace />
  }
  return <Outlet />
}

export function SupplierApprovedRoute() {
  const { supplierStatus } = useAuth()
  if (supplierStatus && supplierStatus !== 'aprovado') {
    return <Navigate to="/supplier/onboarding" replace />
  }
  return <Outlet />
}

export function SelectRoleRoute() {
  const { roles, activeRole, isLoading } = useAuth()

  if (isLoading) return <AuthLoading />
  if (roles.length <= 1 && activeRole) {
    return <Navigate to={getDashboardForRole(activeRole)} replace />
  }
  return <Outlet />
}

export function ActiveRoleLayout() {
  const { activeRole, roles, isLoading } = useAuth()

  if (isLoading) return <AuthLoading />
  if (!activeRole) return <Navigate to="/auth/select-role" replace />

  const role = activeRole
  if (role === 'buyer') return <Navigate to="/buyer/dashboard" replace />
  if (role === 'supplier') return <Navigate to="/supplier/board" replace />
  if (role === 'admin' || role === 'commercial') return <Navigate to="/admin/metrics" replace />
  if (roles[0]) return <Navigate to={getDashboardForRole(roles[0])} replace />
  return <Navigate to="/auth/select-role" replace />
}
