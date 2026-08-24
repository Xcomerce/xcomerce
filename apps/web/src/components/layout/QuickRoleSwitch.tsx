import { ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getDashboardForRole, type UserRole } from '@keve/shared'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ensureBuyerAccess } from '@/services/profile'
import { SUPPLIER_REGISTRATION_SETTINGS_URL } from '@/config/navigation'

export function getQuickRoleSwitchTarget(activeRole: UserRole | null): UserRole | null {
  if (activeRole === 'buyer') return 'supplier'
  if (activeRole === 'supplier') return 'buyer'
  return null
}

export function getQuickRoleSwitchLabel(targetRole: UserRole): string {
  return targetRole === 'buyer' ? 'Painel comprador' : 'Painel fornecedor'
}

export function shouldShowFullRolePicker(roles: UserRole[]): boolean {
  if (roles.length <= 1) return false
  const hasOtherRoles = roles.some((role) => role === 'admin' || role === 'commercial')
  return hasOtherRoles || roles.length > 2
}

type QuickRoleSwitchProps = {
  onAfterSwitch?: () => void
}

function useQuickRoleSwitch(onAfterSwitch?: () => void) {
  const navigate = useNavigate()
  const { user, roles, activeRole, supplierStatus, setActiveRole, refreshProfile } = useAuth()
  const targetRole = getQuickRoleSwitchTarget(activeRole)

  async function switchRole() {
    if (!targetRole || !user) return

    try {
      if (targetRole === 'buyer') {
        await ensureBuyerAccess(user.id)
        await refreshProfile()
      }

      if (targetRole === 'supplier' && !roles.includes('supplier')) {
        navigate('/supplier/onboarding')
        onAfterSwitch?.()
        return
      }

      if (targetRole === 'supplier' && supplierStatus !== 'aprovado') {
        navigate(SUPPLIER_REGISTRATION_SETTINGS_URL)
        onAfterSwitch?.()
        return
      }

      setActiveRole(targetRole)
      navigate(getDashboardForRole(targetRole))
      onAfterSwitch?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível trocar de perfil')
    }
  }

  return { targetRole, switchRole }
}

export function QuickRoleSwitchMenuItem({ onAfterSwitch }: QuickRoleSwitchProps) {
  const { targetRole, switchRole } = useQuickRoleSwitch(onAfterSwitch)
  if (!targetRole) return null

  return (
    <DropdownMenuItem onClick={() => void switchRole()}>
      {getQuickRoleSwitchLabel(targetRole)}
    </DropdownMenuItem>
  )
}

export function QuickRoleSwitchButton({ onAfterSwitch }: QuickRoleSwitchProps) {
  const { targetRole, switchRole } = useQuickRoleSwitch(onAfterSwitch)
  if (!targetRole) return null

  return (
    <Button variant="ghost" className="mb-2 w-full justify-start" onClick={() => void switchRole()}>
      <ArrowLeftRight size={16} />
      {getQuickRoleSwitchLabel(targetRole)}
    </Button>
  )
}
