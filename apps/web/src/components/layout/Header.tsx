import { useTheme } from 'next-themes'
import { ArrowLeft, Bell, Menu, Moon, Sun, Search } from 'lucide-react'
import { Link, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
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

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

type HeaderProps = {
  onMenuClick: () => void
  className?: string
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const pageTitle = usePageTitle()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { profile, roles, signOut } = useAuth()
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const selectedUf = searchParams.get('uf') || ''

  const isBackToOffersPage = pathname.startsWith('/buyer/offers/')
  const isCatalogFormPage =
    pathname === '/supplier/catalog/new' ||
    (pathname.startsWith('/supplier/catalog/') && pathname.endsWith('/edit'))
  const isSupplierOfferPage = pathname.startsWith('/supplier/offers/')
  const supplierOrderDetailMatch = useMatch('/supplier/orders/:id')
  const supplierOrderId = supplierOrderDetailMatch?.params.id
  const buyerOrderDetailMatch = useMatch('/buyer/orders/:id')
  const buyerOrderId = buyerOrderDetailMatch?.params.id
  const orderDetailBackPath = supplierOrderDetailMatch
    ? '/supplier/orders'
    : buyerOrderDetailMatch
      ? '/buyer/orders'
      : null
  const orderDetailId = supplierOrderId ?? buyerOrderId

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchParams((prev) => {
      if (value) {
        prev.set('search', value)
      } else {
        prev.delete('search')
      }
      return prev
    }, { replace: true })
  }

  const handleUfChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSearchParams((prev) => {
      if (value) {
        prev.set('uf', value)
      } else {
        prev.delete('uf')
      }
      return prev
    }, { replace: true })
  }

  return (
    <header
      className={cn(
        'glass-navbar sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 lg:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 flex-1 lg:flex-initial">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
        {isBackToOffersPage ? (
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
        ) : isCatalogFormPage ? (
          <button
            type="button"
            onClick={() => navigate('/supplier/catalog')}
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar ao catálogo"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-display text-sm font-semibold sm:text-base lg:text-lg">
              {pageTitle}
            </h1>
          </button>
        ) : isSupplierOfferPage ? (
          <button
            type="button"
            onClick={() => navigate('/supplier/board')}
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar ao mural"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-display text-sm font-semibold sm:text-base lg:text-lg">
              {pageTitle}
            </h1>
          </button>
        ) : orderDetailBackPath ? (
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5 -ml-1">
            <button
              type="button"
              onClick={() => navigate(orderDetailBackPath)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-secondary/50 transition-colors"
              aria-label="Voltar aos pedidos"
            >
              <ArrowLeft size={15} className="text-muted-foreground" />
            </button>
            {orderDetailId && (
              <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-transparent px-2 font-mono text-[10px] font-semibold leading-none tracking-wider text-foreground sm:px-2.5 sm:text-xs">
                ID#{orderDetailId.slice(0, 8).toUpperCase()}
              </div>
            )}
          </div>
        ) : pathname === '/buyer/feed' ? (
          <div className="flex h-9 w-52 sm:w-80 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-1 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground min-w-0 text-foreground h-full"
            />
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="relative shrink-0 flex items-center pr-3">
              <select
                value={selectedUf}
                onChange={handleUfChange}
                className="appearance-none bg-transparent py-1 pl-1 pr-4 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
              >
                <option value="">UF</option>
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
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
          className="hidden h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50 lg:flex"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-xl p-1.5 hover:bg-secondary/50 lg:flex"
            >
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
            <DropdownMenuItem onClick={() => signOut()}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
