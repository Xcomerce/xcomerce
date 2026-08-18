import { ArrowLeft, Bell, Menu } from 'lucide-react'
import { Link, useLocation, useMatch, useNavigate } from 'react-router-dom'
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
import { useFeedLocationFilter } from '@/hooks/use-feed-location-filter'
import {
  QuickRoleSwitchMenuItem,
  shouldShowFullRolePicker,
} from '@/components/layout/QuickRoleSwitch'
import { FeedSearchInput } from '@/components/buyer/FeedSearchInput'
import { FeedLocationControl } from '@/components/buyer/FeedLocationControl'

type HeaderProps = {
  onMenuClick: () => void
  className?: string
}

function NotificationButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      to="/notifications"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-secondary/50"
      aria-label="Notificações"
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const pageTitle = usePageTitle()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { profile, roles, signOut } = useAuth()
  const { data: unreadCount = 0 } = useUnreadNotificationCount()

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
  const isFeedPage = pathname === '/buyer/feed'
  const isSupplierStorePage = pathname.startsWith('/buyer/stores/')

  useFeedLocationFilter(isFeedPage)

  if (isFeedPage) {
    return (
      <header
        className={cn(
          'glass-navbar sticky top-0 z-30 flex shrink-0 flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-0 lg:h-[4.5rem]',
          className,
        )}
      >
        <div className="flex w-full items-center justify-between gap-3 lg:hidden">
          <div className="min-w-0">
            <FeedLocationControl variant="link" />
          </div>
          <NotificationButton unreadCount={unreadCount} />
        </div>

        <div className="flex min-w-0 w-full flex-col gap-2 lg:flex-1 lg:flex-row lg:items-center lg:gap-3">
          <FeedSearchInput className="w-full lg:max-w-lg" />
          <div className="hidden lg:block lg:w-auto">
            <FeedLocationControl className="min-w-[11.5rem]" />
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <NotificationButton unreadCount={unreadCount} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-secondary/50"
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
              <QuickRoleSwitchMenuItem />
              {shouldShowFullRolePicker(roles) ? (
                <DropdownMenuItem onClick={() => navigate('/auth/select-role')}>Trocar perfil</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    )
  }

  return (
    <header
      className={cn(
        'glass-navbar sticky top-0 z-30 flex shrink-0 items-center justify-between px-4 lg:px-6 h-14',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-initial">
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
            <h1 className="font-display text-sm font-semibold">Voltar para ofertas</h1>
          </button>
        ) : isCatalogFormPage ? (
          <button
            type="button"
            onClick={() => navigate('/supplier/catalog')}
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar ao catálogo"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-display text-sm font-semibold sm:text-base lg:text-lg">{pageTitle}</h1>
          </button>
        ) : isSupplierOfferPage ? (
          <button
            type="button"
            onClick={() => navigate('/supplier/board')}
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar ao mural"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-display text-sm font-semibold sm:text-base lg:text-lg">{pageTitle}</h1>
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
              <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-transparent px-2 text-[10px] font-semibold leading-none tracking-wide text-foreground sm:px-2.5 sm:text-xs">
                Pedido#{orderDetailId.slice(0, 8).toUpperCase()}
              </div>
            )}
          </div>
        ) : isSupplierStorePage ? (
          <button
            type="button"
            onClick={() => navigate('/buyer/feed')}
            className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-secondary/50 transition-colors -ml-1"
            aria-label="Voltar ao Explorar"
          >
            <ArrowLeft size={15} className="shrink-0 text-muted-foreground" />
            <h1 className="truncate font-display text-sm font-semibold sm:text-base lg:text-lg">Voltar ao Explorar</h1>
          </button>
        ) : (
          <h1 className="max-w-[180px] truncate font-display text-lg font-semibold lg:max-w-none lg:text-xl">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NotificationButton unreadCount={unreadCount} />
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
            <QuickRoleSwitchMenuItem />
            {shouldShowFullRolePicker(roles) ? (
              <DropdownMenuItem onClick={() => navigate('/auth/select-role')}>Trocar perfil</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
