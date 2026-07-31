import { NavLink, useNavigate } from 'react-router-dom'
import type { RoleNavConfig } from '@/config/navigation'
import { isSupplierNavItemDisabled } from '@/config/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export function BottomNav({
  config,
  hiddenOnMobile = false,
}: {
  config: RoleNavConfig
  hiddenOnMobile?: boolean
}) {
  const navigate = useNavigate()
  const { activeRole, supplierStatus } = useAuth()
  const { left, right, fab } = config.bottomNav
  const isSupplierPending = activeRole === 'supplier' && supplierStatus !== 'aprovado'
  const fabDisabled = isSupplierPending && isSupplierNavItemDisabled(fab.to, supplierStatus)

  if (hiddenOnMobile) return null

  return (
    <nav className="glass-bottomnav fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="relative grid h-20 w-full grid-cols-5 items-end px-1 pb-safe-bottom">
        {left.map((item) => (
          <BottomNavItem
            key={item.to}
            {...item}
            disabled={isSupplierPending && isSupplierNavItemDisabled(item.to, supplierStatus)}
          />
        ))}

        <div className="flex flex-col items-center gap-0.5 pb-1">
          <button
            type="button"
            onClick={() => !fabDisabled && navigate(fab.to)}
            disabled={fabDisabled}
            title={fabDisabled ? 'Disponível após aprovação do cadastro' : undefined}
            className={cn(
              'relative -top-5 flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-full shadow-lg transition-transform',
              fabDisabled
                ? 'cursor-not-allowed bg-muted text-muted-foreground/50'
                : 'bg-accent text-accent-foreground hover:scale-105',
            )}
            aria-label={fab.label}
          >
            <fab.icon size={26} strokeWidth={2.5} />
          </button>
          <span
            className={cn(
              'w-full truncate px-0.5 text-center text-[10px] font-medium leading-none',
              fabDisabled ? 'text-muted-foreground/40' : 'text-muted-foreground',
            )}
          >
            {fab.label}
          </span>
        </div>

        {right.map((item) => (
          <BottomNavItem
            key={item.to}
            {...item}
            disabled={isSupplierPending && isSupplierNavItemDisabled(item.to, supplierStatus)}
          />
        ))}
      </div>
    </nav>
  )
}

function BottomNavItem({
  to,
  icon: Icon,
  label,
  hasNotification,
  disabled = false,
}: {
  to: string
  icon: RoleNavConfig['bottomNav']['left'][0]['icon']
  label?: string
  hasNotification?: boolean
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title="Disponível após aprovação do cadastro"
        className="flex w-full cursor-not-allowed flex-col items-center gap-0.5 pb-1 text-muted-foreground/40"
      >
        <span className="relative flex h-11 w-12 items-center justify-center rounded-xl">
          <Icon size={24} />
        </span>
        {label && (
          <span className="w-full truncate px-0.5 text-center text-[10px] font-medium leading-none">{label}</span>
        )}
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex w-full flex-col items-center gap-0.5 pb-1 transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'relative flex h-11 w-12 items-center justify-center rounded-xl transition-colors',
              isActive && 'bg-secondary/50'
            )}
          >
            <Icon size={24} />
            {hasNotification && (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </span>
          {label && (
            <span className="w-full truncate px-0.5 text-center text-[10px] font-medium leading-none">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
