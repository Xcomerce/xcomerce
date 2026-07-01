import { useEffect, useState } from 'react'
import type { UserRole } from '@keve/shared'
import { NAV_BY_ROLE } from '@/config/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type AppShellOutletContext = {
  shellRole: UserRole
}

const FULL_HEIGHT_LAYOUT_PATHS = [
  '/buyer/demands/new',
  '/buyer/dashboard',
  '/settings/profile',
  '/supplier/auto-offers',
  '/supplier/onboarding',
  '/admin/subscriptions',
  '/admin/users',
  '/admin/categories',
]
const FULL_WIDTH_LAYOUT_PATHS = [
  '/buyer/demands/new',
  '/buyer/feed',
  '/buyer/dashboard',
  '/settings/profile',
  '/settings/billing',
  '/notifications',
  '/support',
  '/supplier/auto-offers',
  '/supplier/onboarding',
  '/supplier/board',
]

export function AppShell({ role }: { role: UserRole }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const config = NAV_BY_ROLE[role]
  const { pathname } = useLocation()
  const isSupplierCatalogForm =
    pathname === '/supplier/catalog/new' ||
    (pathname.startsWith('/supplier/catalog/') && pathname.endsWith('/edit'))
  const isSupplierOnboarding = pathname === '/supplier/onboarding'
  const isSupplierOfferPage = pathname.startsWith('/supplier/offers/')
  const isSupplierOrderDetailPage =
    pathname.startsWith('/supplier/orders/') && pathname !== '/supplier/orders'
  const isBuyerNewDemandPage = pathname === '/buyer/demands/new'
  const isBuyerOfferDetailPage = pathname.startsWith('/buyer/offers/')
  const isFullHeightLayout =
    FULL_HEIGHT_LAYOUT_PATHS.includes(pathname) ||
    pathname.startsWith('/buyer/offers/') ||
    isSupplierCatalogForm ||
    isSupplierOfferPage ||
    isSupplierOrderDetailPage
  const isFullWidthLayout =
    FULL_WIDTH_LAYOUT_PATHS.includes(pathname) ||
    pathname.startsWith('/buyer/offers/') ||
    isSupplierCatalogForm ||
    isSupplierOfferPage ||
    isSupplierOrderDetailPage

  useEffect(() => {
    if (!isFullHeightLayout) return
    const html = document.documentElement
    const body = document.body

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [isFullHeightLayout])

  return (
    <div className={cn('bg-background', isFullHeightLayout ? 'h-dvh overflow-hidden' : 'min-h-screen')}>
      <Sidebar config={config} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} config={config} />

      <div
        className={cn(
          'lg:pl-60',
          isFullHeightLayout && 'flex h-full flex-col overflow-hidden',
        )}
      >
        <Header onMenuClick={() => setMobileOpen(true)} className={isFullHeightLayout ? 'shrink-0' : undefined} />

        <main
          className={cn(
            'pb-24 lg:pb-8',
            isFullHeightLayout && 'min-h-0 flex-1 overflow-hidden pb-0 lg:pb-0',
          )}
        >
          <div
            className={cn(
              isFullHeightLayout
                ? 'h-full min-h-0 w-full overflow-hidden p-0'
                : isFullWidthLayout
                  ? 'w-full max-w-none p-4 lg:p-6'
                  : 'mx-auto max-w-7xl p-4 lg:p-6',
            )}
          >
            <Outlet context={{ shellRole: role } satisfies AppShellOutletContext} />
          </div>
        </main>
      </div>

      <BottomNav
        config={config}
        hiddenOnMobile={
          isBuyerNewDemandPage ||
          isBuyerOfferDetailPage ||
          isSupplierCatalogForm ||
          isSupplierOnboarding ||
          isSupplierOfferPage ||
          isSupplierOrderDetailPage
        }
      />
    </div>
  )
}
