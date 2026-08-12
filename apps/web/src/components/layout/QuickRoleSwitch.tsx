import { ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getDashboardForRole, type UserRole } from '@keve/shared'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/config/navigation'

export function getQuickRoleSwitchTarget(
  activeRole: UserRole | null,
  roles: UserRole[],
): UserRole | null {
  if (activeRole === 'buyer' && roles.includes('supplier')) return 'supplier'
  if (activeRole === 'supplier' && roles.includes('buyer')) return 'buyer'
  return null
}

export function getQuickRoleSwitchLabel(targetRole: UserRole): string {
  return `Ir para ${ROLE_LABELS[targetRole]}`
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
  const { roles, activeRole, setActiveRole } = useAuth()
  const targetRole = getQuickRoleSwitchTarget(activeRole, roles)

  function switchRole() {
    if (!targetRole) return
    setActiveRole(targetRole)
    navigate(getDashboardForRole(targetRole))
    onAfterSwitch?.()
  }

  return { targetRole, switchRole }
}

export function QuickRoleSwitchMenuItem({ onAfterSwitch }: QuickRoleSwitchProps) {
  const { targetRole, switchRole } = useQuickRoleSwitch(onAfterSwitch)
  if (!targetRole) return null

  return (
    <DropdownMenuItem onClick={switchRole}>
      {getQuickRoleSwitchLabel(targetRole)}
    </DropdownMenuItem>
  )
}

export function QuickRoleSwitchButton({ onAfterSwitch }: QuickRoleSwitchProps) {
  const { targetRole, switchRole } = useQuickRoleSwitch(onAfterSwitch)
  if (!targetRole) return null

  return (
    <Button variant="ghost" className="mb-2 w-full justify-start" onClick={switchRole}>
      <ArrowLeftRight size={16} />
      {getQuickRoleSwitchLabel(targetRole)}
    </Button>
  )
}
