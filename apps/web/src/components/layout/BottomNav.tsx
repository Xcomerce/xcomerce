import { NavLink, useNavigate } from 'react-router-dom'
import type { RoleNavConfig } from '@/config/navigation'
import { cn } from '@/lib/utils'

export function BottomNav({
  config,
  hiddenOnMobile = false,
}: {
  config: RoleNavConfig
  hiddenOnMobile?: boolean
}) {
  const navigate = useNavigate()
  const { left, right, fab } = config.bottomNav

  if (hiddenOnMobile) return null

  return (
    <nav className="glass-bottomnav fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="relative grid h-20 w-full grid-cols-5 items-end px-1 pb-safe-bottom">
        {left.map((item) => (
          <BottomNavItem key={item.to} {...item} />
        ))}

        <div className="flex flex-col items-center gap-0.5 pb-1">
          <button
            type="button"
            onClick={() => navigate(fab.to)}
            className="relative -top-5 flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
            aria-label={fab.label}
          >
            <fab.icon size={26} strokeWidth={2.5} />
          </button>
          <span className="w-full truncate px-0.5 text-center text-[10px] font-medium leading-none text-muted-foreground">
            {fab.label}
          </span>
        </div>

        {right.map((item) => (
          <BottomNavItem key={item.to} {...item} />
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
}: {
  to: string
  icon: RoleNavConfig['bottomNav']['left'][0]['icon']
  label?: string
  hasNotification?: boolean
}) {
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
