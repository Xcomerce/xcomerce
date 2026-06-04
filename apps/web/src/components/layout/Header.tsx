import { useTheme } from 'next-themes'
import { ArrowLeft, Bell, Menu, Moon, Sun } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import { cn, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/config/navigation'
import { getDashboardForRole } from '@keve/shared'

type HeaderProps = {
  onMenuClick: () => void
  className?: string
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const pageTitle = usePageTitle()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { profile, roles, signOut, setActiveRole } = useAuth()
  const { data: unreadCount = 0 } = useUnreadNotificationCount()

  const isAuctionPage = pathname.startsWith('/buyer/demands/') && pathname.endsWith('/auction')

  return (
    <header
      className={cn(
        'glass-navbar sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 lg:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        {isAuctionPage ? (
          <button
            type="button"
            onClick={() => navigate('/buyer/dashboard')}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar para ofertas"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="font-display text-sm font-semibold">
              Voltar para ofertas
            </h1>
          </button>
        ) : (
          <h1 className="max-w-[180px] truncate font-display text-lg font-semibold lg:max-w-none lg:text-xl">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50"
          aria-label="Notificações"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-secondary/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(profile?.full_name ?? 'U')}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>Meu perfil</DropdownMenuItem>
            {roles.length > 1 && (
              <DropdownMenuItem onClick={() => navigate('/auth/select-role')}>Trocar perfil</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {roles.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => {
                  setActiveRole(role)
                  navigate(getDashboardForRole(role))
                }}
              >
                Usar como {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
