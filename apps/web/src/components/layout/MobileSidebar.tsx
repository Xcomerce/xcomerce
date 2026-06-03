import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import type { RoleNavConfig } from '@/config/navigation'
import { NavSectionBlock } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { getInitials } from '@/lib/utils'

type MobileSidebarProps = {
  open: boolean
  onClose: () => void
  config: RoleNavConfig
}

export function MobileSidebar({ open, onClose, config }: MobileSidebarProps) {
  const { profile, signOut } = useAuth()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="animate-slide-in-left fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar lg:hidden">
        <div className="flex items-center justify-between border-b border-sidebar-border/50 p-4">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-dark text-xs font-bold text-white">
              K
            </div>
            <span className="font-display font-semibold">Keven B2b</span>
          </Link>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 p-3">
          {config.sections.map((section) => (
            <NavSectionBlock key={section.title} section={section} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border/50 p-3">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-card p-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              onClose()
              signOut()
            }}
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
