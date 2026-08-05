import { NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { NavItem, NavSection } from '@/config/navigation'
import { isSupplierNavItemDisabled, supplierNeedsRegistrationAttention } from '@/config/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export function NavSectionBlock({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(true)
  const { activeRole, supplierStatus } = useAuth()
  const isSupplierPending = activeRole === 'supplier' && supplierStatus !== 'aprovado'

  return (
    <div className="mt-6 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <span>{section.title}</span>
        <ChevronDown size={14} className={cn('transition-transform', open ? 'rotate-0' : '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const showRegistrationBadge =
              item.to === '/settings/profile' &&
              isSupplierPending &&
              supplierNeedsRegistrationAttention(supplierStatus)

            return (
              <SidebarNavItem
                key={item.to}
                item={item}
                disabled={isSupplierPending && isSupplierNavItemDisabled(item.to, supplierStatus)}
                badge={showRegistrationBadge ? 1 : item.badge}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SidebarNavItem({
  item,
  disabled = false,
  badge,
}: {
  item: NavItem
  disabled?: boolean
  badge?: number
}) {
  const notificationBadge = badge ?? item.badge
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title="Disponível após aprovação do cadastro"
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40"
      >
        <item.icon size={18} />
        <span className="flex-1">{item.label}</span>
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
        )
      }
    >
      <item.icon size={18} />
      <span className="flex-1">{item.label}</span>
      {notificationBadge != null && notificationBadge > 0 && (
        <span className="rounded bg-destructive px-1.5 py-0.5 text-xs font-medium text-destructive-foreground">
          !
        </span>
      )}
    </NavLink>
  )
}
