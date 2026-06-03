import { NavLink, useNavigate } from 'react-router-dom'
import type { RoleNavConfig } from '@/config/navigation'
import { cn } from '@/lib/utils'

export function BottomNav({ config }: { config: RoleNavConfig }) {
  const navigate = useNavigate()
  const { left, right, fab } = config.bottomNav

  return (
    <nav className="glass-bottomnav fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="relative mx-auto grid h-[4.5rem] max-w-lg grid-cols-[1fr_auto_1fr] items-end px-2 pb-safe-bottom">
        <div className="flex items-center justify-end gap-0.5 pb-2">
          {left.map((item) => (
            <BottomNavItem key={item.to} {...item} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate(fab.to)}
          className="relative -top-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
          aria-label={fab.label}
        >
          <fab.icon size={24} strokeWidth={2.5} />
        </button>

        <div className="flex items-center justify-start gap-0.5 pb-2">
          {right.map((item) => (
            <BottomNavItem key={item.to} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}

function BottomNavItem({
  to,
  icon: Icon,
  hasNotification,
}: {
  to: string
  icon: RoleNavConfig['bottomNav']['left'][0]['icon']
  hasNotification?: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
          isActive ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      <Icon size={22} />
      {hasNotification && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
      )}
    </NavLink>
  )
}
