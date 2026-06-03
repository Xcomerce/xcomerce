import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  LayoutGrid,
  LayoutList,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  Tags,
  User,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@keve/shared'

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
        { to: '/buyer/feed', label: 'Feed de ofertas', icon: LayoutGrid },
        { to: '/buyer/dashboard', label: 'Leilão de ofertas', icon: LayoutList },
        { to: '/buyer/demands/new', label: 'Solicitar oferta', icon: PlusCircle },
        { to: '/buyer/orders', label: 'Pedidos', icon: Package },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/settings/billing', label: 'Plano', icon: CreditCard },
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/buyer/feed', icon: LayoutGrid, label: 'Feed de ofertas' },
      { to: '/buyer/dashboard', icon: LayoutList, label: 'Leilão' },
    ],
    right: [
      { to: '/buyer/orders', icon: Package, label: 'Pedidos' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/buyer/demands/new', icon: PlusCircle, label: 'Solicitar oferta' },
  },
}

export const supplierNav: RoleNavConfig = {
  sections: [
    {
      title: 'Principal',
      items: [
        { to: '/supplier/board', label: 'Oportunidades', icon: LayoutGrid },
        { to: '/supplier/catalog', label: 'Catálogo', icon: Boxes },
        { to: '/supplier/orders', label: 'Pedidos', icon: Package },
        { to: '/supplier/onboarding', label: 'Onboarding', icon: FileText },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/settings/billing', label: 'Plano', icon: CreditCard },
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/supplier/board', icon: LayoutGrid, hasNotification: true },
      { to: '/supplier/catalog', icon: Boxes },
    ],
    right: [
      { to: '/supplier/orders', icon: Package },
      { to: '/settings/profile', icon: User },
    ],
    fab: { to: '/supplier/board', icon: LayoutGrid, label: 'Oportunidades' },
  },
}

export const adminNav: RoleNavConfig = {
  sections: [
    {
      title: 'Operação',
      items: [
        { to: '/admin/approvals', label: 'Aprovações', icon: ShieldCheck },
        { to: '/admin/metrics', label: 'Métricas', icon: BarChart3 },
        { to: '/admin/categories', label: 'Categorias', icon: Tags },
        { to: '/admin/audit', label: 'Auditoria', icon: FileText },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/admin/approvals', icon: ShieldCheck },
      { to: '/admin/metrics', icon: BarChart3 },
    ],
    right: [
      { to: '/admin/categories', icon: Tags },
      { to: '/settings/profile', icon: User },
    ],
    fab: { to: '/admin/metrics', icon: BarChart3, label: 'Métricas' },
  },
}

export const NAV_BY_ROLE: Record<UserRole, RoleNavConfig> = {
  buyer: buyerNav,
  supplier: supplierNav,
  admin: adminNav,
  commercial: adminNav,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  buyer: 'Comprador',
  supplier: 'Fornecedor',
  admin: 'Administrador',
  commercial: 'Comercial',
}
