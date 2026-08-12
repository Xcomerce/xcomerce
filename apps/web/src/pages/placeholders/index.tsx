import { ProfilePage } from '@/pages/settings/ProfilePage'
import { BillingPage } from '@/pages/settings/BillingPage'
import { OnboardingPage } from '@/pages/supplier/OnboardingPage'
import { SupplierBoardPage } from '@/pages/supplier/SupplierBoardPage'
import { CatalogPage } from '@/pages/supplier/CatalogPage'
import { ProductFormPage } from '@/pages/supplier/ProductFormPage'
import { OfferDetailPage } from '@/pages/supplier/OfferDetailPage'
import { SupplierOrdersPage } from '@/pages/supplier/SupplierOrdersPage'
import { SupplierOrderDetailPage } from '@/pages/supplier/SupplierOrderDetailPage'
import { AutoOfferSettingsPage } from '@/pages/supplier/AutoOfferSettingsPage'
import { BuyerDashboardPage } from '@/pages/buyer/BuyerDashboardPage'
import { BuyerFeedPage } from '@/pages/buyer/BuyerFeedPage'
import { NewDemandPage } from '@/pages/buyer/NewDemandPage'
import { BuyerOfferDetailPage } from '@/pages/buyer/BuyerOfferDetailPage'
import { BuyerOrdersPage } from '@/pages/buyer/BuyerOrdersPage'
import { BuyerOrderDetailPage } from '@/pages/buyer/BuyerOrderDetailPage'
import { SupplierStorePage } from '@/pages/buyer/SupplierStorePage'
import { ApprovalsPage } from '@/pages/admin/ApprovalsPage'
import { MetricsPage } from '@/pages/admin/MetricsPage'
import { CategoriesAdminPage } from '@/pages/admin/CategoriesAdminPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { PlansAdminPage } from '@/pages/admin/PlansAdminPage'
import { FinancialReportsPage } from '@/pages/admin/FinancialReportsPage'
import { SubscriptionsAdminPage } from '@/pages/admin/SubscriptionsAdminPage'
import { UsersAdminPage } from '@/pages/admin/UsersAdminPage'
import { LeadsAdminPage } from '@/pages/admin/LeadsAdminPage'
import { LeadDetailPage } from '@/pages/admin/LeadDetailPage'
import { EmailTemplatesAdminPage } from '@/pages/admin/EmailTemplatesAdminPage'
import { EmailProvidersAdminPage } from '@/pages/admin/EmailProvidersAdminPage'
import { SupportSettingsAdminPage } from '@/pages/admin/SupportSettingsAdminPage'
import { NotificationsPage } from '@/pages/shared/NotificationsPage'
import { PublicProfilePage } from '@/pages/shared/PublicProfilePage'
import { SupportPage } from '@/pages/shared/SupportPage'
import { UnsubscribePage } from '@/pages/shared/UnsubscribePage'

export const buyerPages = {
  feed: <BuyerFeedPage />,
  dashboard: <BuyerDashboardPage />,
  newDemand: <NewDemandPage />,
  offerDetail: <BuyerOfferDetailPage />,
  orders: <BuyerOrdersPage />,
  orderDetail: <BuyerOrderDetailPage />,
  store: <SupplierStorePage />,
}

export const supplierPages = {
  onboarding: <OnboardingPage />,
  autoOffers: <AutoOfferSettingsPage />,
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
  financialReports: <FinancialReportsPage />,
  plans: <PlansAdminPage />,
  subscriptions: <SubscriptionsAdminPage />,
  users: <UsersAdminPage />,
  categories: <CategoriesAdminPage />,
  audit: <AuditPage />,
  leads: <LeadsAdminPage />,
  leadDetail: <LeadDetailPage />,
  emailTemplates: <EmailTemplatesAdminPage />,
  emailProviders: <EmailProvidersAdminPage />,
  supportSettings: <SupportSettingsAdminPage />,
}

export const sharedPages = {
  profile: <ProfilePage />,
  billing: <BillingPage />,
  notifications: <NotificationsPage />,
  publicProfile: <PublicProfilePage />,
  support: <SupportPage />,
  unsubscribe: <UnsubscribePage />,
}
