import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import type { RoleNavConfig } from '@/config/navigation'
import { NavSectionBlock } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { getInitials } from '@/lib/utils'

export function Sidebar({ config }: { config: RoleNavConfig }) {
  const { profile, signOut } = useAuth()

  return (
    <aside className="glass-sidebar fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col px-3 py-4 lg:flex">
      <Link to="/" className="mb-6 flex items-center px-2">
        <img src="/logo-dark.svg" className="h-12 object-contain dark:hidden" alt="X COMERCE" />
        <img src="/logo-clara.svg" className="h-12 object-contain hidden dark:block" alt="X COMERCE" />
      </Link>

      <nav className="scrollbar-custom flex-1 overflow-y-auto">
        {config.sections.map((section) => (
          <NavSectionBlock key={section.title} section={section} />
        ))}
      </nav>

      <div className="mt-4 rounded-xl border border-sidebar-border bg-card p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name ?? 'Usuário'}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={() => signOut()}>
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </aside>
  )
}
