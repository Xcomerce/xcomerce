import { NavLink, useNavigate } from 'react-router-dom'
import type { RoleNavConfig } from '@/config/navigation'
import { cn } from '@/lib/utils'

export function BottomNav({ config }: { config: RoleNavConfig }) {
  const navigate = useNavigate()
  const { left, right, fab } = config.bottomNav

  return (
    <nav className="glass-bottomnav fixed bottom-0 left-0 right-0 z-40 px-2 pb-safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 py-2">
        <div className="flex items-center gap-1">
          {left.map((item) => (
            <BottomNavItem key={item.to} {...item} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(fab.to)}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
          aria-label={fab.label}
        >
          <fab.icon size={24} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-1">
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
