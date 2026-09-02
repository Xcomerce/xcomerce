import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Headset,
  LayoutGrid,
  LayoutList,
  Mail,
  Package,
  PlusCircle,
  Settings,
  Server,
  ShieldCheck,
  Tags,
  User,
  UserPlus,
  Users,
  Bell,
  Zap,
  Wallet,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole, SupplierStatus } from '@keve/shared'
import { BILLING_PAGE_ENABLED, AUTO_OFFER_ENABLED } from '@/config/features'

export const SUPPLIER_REGISTRATION_SETTINGS_URL = '/settings/profile?section=registration'

export const SUPPLIER_UNAPPROVED_ALLOWED_PATHS = [
  '/supplier/onboarding',
  '/settings/profile',
  '/support',
] as const

export function supplierNeedsRegistrationAttention(
  supplierStatus: SupplierStatus | null | undefined,
): boolean {
  return supplierStatus != null && supplierStatus !== 'aprovado'
}

export function isSupplierPathAllowedWhenUnapproved(pathname: string): boolean {
  return SUPPLIER_UNAPPROVED_ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function isSupplierNavItemDisabled(
  to: string,
  supplierStatus: SupplierStatus | null | undefined,
): boolean {
  if (supplierStatus === 'aprovado') return false
  return !(SUPPLIER_UNAPPROVED_ALLOWED_PATHS as readonly string[]).includes(to)
}

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

export type NavSection = {
  title: string
  items: NavItem[]
}

export type BottomNavItem = {
  to: string
  icon: LucideIcon
  label?: string
  hasNotification?: boolean
}

export type RoleNavConfig = {
  sections: NavSection[]
  bottomNav: {
    left: BottomNavItem[]
    right: BottomNavItem[]
    fab: {
      to: string
      icon: LucideIcon
      label: string
    }
  }
}

export const buyerNav: RoleNavConfig = {
  sections: [
    {
      title: 'Principal',
      items: [
        { to: '/buyer/feed', label: 'Explorar', icon: LayoutGrid },
        { to: '/buyer/demands/new', label: 'Nova solicitação', icon: PlusCircle },
        { to: '/buyer/dashboard', label: 'Minhas solicitações', icon: LayoutList },
        { to: '/buyer/orders', label: 'Meus pedidos', icon: Package },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/support', label: 'Suporte', icon: Headset },
        ...(BILLING_PAGE_ENABLED
          ? [{ to: '/settings/billing', label: 'Plano', icon: CreditCard }]
          : []),
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/buyer/feed', icon: LayoutGrid, label: 'Explorar' },
      { to: '/buyer/dashboard', icon: LayoutList, label: 'Minhas solicitações' },
    ],
    right: [
      { to: '/buyer/orders', icon: Package, label: 'Meus pedidos' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/buyer/demands/new', icon: PlusCircle, label: 'Nova solicitação' },
  },
}

export const supplierNav: RoleNavConfig = {
  sections: [
    {
      title: 'Principal',
      items: [
        { to: '/supplier/board', label: 'Solicitações de compra', icon: LayoutGrid },
        { to: '/supplier/catalog', label: 'Meus produtos', icon: Boxes },
        { to: '/supplier/orders', label: 'Pedidos', icon: Package },
      ],
    },
    {
      title: 'Conta',
      items: [
        ...(AUTO_OFFER_ENABLED
          ? [{ to: '/supplier/auto-offers', label: 'Auto-proposta', icon: Zap }]
          : []),
        { to: '/support', label: 'Suporte', icon: Headset },
        ...(BILLING_PAGE_ENABLED
          ? [{ to: '/settings/billing', label: 'Plano', icon: CreditCard }]
          : []),
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/supplier/board', icon: LayoutGrid, label: 'Solicitações' },
      { to: '/supplier/catalog', icon: Boxes, label: 'Meus produtos' },
    ],
    right: [
      { to: '/supplier/orders', icon: Package, label: 'Pedidos' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/supplier/board', icon: LayoutGrid, label: 'Solicitações' },
  },
}

export const adminNav: RoleNavConfig = {
  sections: [
    {
      title: 'Operação',
      items: [
        { to: '/admin/metrics', label: 'Métricas', icon: BarChart3 },
        { to: '/admin/leads', label: 'Leads', icon: UserPlus },
        { to: '/admin/email-templates', label: 'E-mails', icon: Mail },
        { to: '/admin/email-providers', label: 'Provedores', icon: Server },
        { to: '/admin/users', label: 'Usuários', icon: Users },
        { to: '/admin/approvals', label: 'Aprovações', icon: ShieldCheck },
        { to: '/admin/financial-reports', label: 'Relatórios', icon: Wallet },
        { to: '/admin/plans', label: 'Planos', icon: CreditCard },
        { to: '/admin/subscriptions', label: 'Assinaturas', icon: Receipt },
        { to: '/admin/categories', label: 'Categorias', icon: Tags },
        { to: '/admin/audit', label: 'Auditoria', icon: FileText },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/support', label: 'Suporte', icon: Headset },
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/admin/metrics', icon: BarChart3, label: 'Métricas' },
      { to: '/admin/approvals', icon: ShieldCheck, label: 'Aprovações' },
    ],
    right: [
      { to: '/admin/categories', icon: Tags, label: 'Categorias' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/admin/metrics', icon: BarChart3, label: 'Métricas' },
  },
}

const commercialNav: RoleNavConfig = {
  sections: adminNav.sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.to !== '/admin/users'),
  })),
  bottomNav: adminNav.bottomNav,
}

export const NAV_BY_ROLE: Record<UserRole, RoleNavConfig> = {
  buyer: buyerNav,
  supplier: supplierNav,
  admin: adminNav,
  commercial: commercialNav,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  buyer: 'Comprador',
  supplier: 'Fornecedor',
  admin: 'Administrador',
  commercial: 'Comercial',
}
