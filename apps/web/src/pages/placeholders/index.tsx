import { ProfilePage } from '@/pages/settings/ProfilePage'
import { BillingPage } from '@/pages/settings/BillingPage'
import { OnboardingPage } from '@/pages/supplier/OnboardingPage'
import { SupplierBoardPage } from '@/pages/supplier/SupplierBoardPage'
import { CatalogPage } from '@/pages/supplier/CatalogPage'
import { ProductFormPage } from '@/pages/supplier/ProductFormPage'
import { OfferDetailPage } from '@/pages/supplier/OfferDetailPage'
import { SupplierOrdersPage } from '@/pages/supplier/SupplierOrdersPage'
import { SupplierOrderDetailPage } from '@/pages/supplier/SupplierOrderDetailPage'
import { BuyerDashboardPage } from '@/pages/buyer/BuyerDashboardPage'
import { NewDemandPage } from '@/pages/buyer/NewDemandPage'
import { DemandDetailPage } from '@/pages/buyer/DemandDetailPage'
import { BuyerOrdersPage } from '@/pages/buyer/BuyerOrdersPage'
import { BuyerOrderDetailPage } from '@/pages/buyer/BuyerOrderDetailPage'
import { ApprovalsPage } from '@/pages/admin/ApprovalsPage'
import { MetricsPage } from '@/pages/admin/MetricsPage'
import { CategoriesAdminPage } from '@/pages/admin/CategoriesAdminPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { NotificationsPage } from '@/pages/shared/NotificationsPage'
import { PublicProfilePage } from '@/pages/shared/PublicProfilePage'

export const buyerPages = {
  dashboard: <BuyerDashboardPage />,
  newDemand: <NewDemandPage />,
  demandDetail: <DemandDetailPage />,
  orders: <BuyerOrdersPage />,
  orderDetail: <BuyerOrderDetailPage />,
}

export const supplierPages = {
  onboarding: <OnboardingPage />,
  board: <SupplierBoardPage />,
  catalog: <CatalogPage />,
  catalogNew: <ProductFormPage />,
  catalogEdit: <ProductFormPage />,
  offerDetail: <OfferDetailPage />,
  orders: <SupplierOrdersPage />,
  orderDetail: <SupplierOrderDetailPage />,
}

export const adminPages = {
  approvals: <ApprovalsPage />,
  metrics: <MetricsPage />,
  categories: <CategoriesAdminPage />,
  audit: <AuditPage />,
}

export const sharedPages = {
  profile: <ProfilePage />,
  billing: <BillingPage />,
  notifications: <NotificationsPage />,
  publicProfile: <PublicProfilePage />,
}
