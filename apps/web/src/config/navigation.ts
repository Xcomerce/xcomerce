import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Headset,
  LayoutGrid,
  LayoutList,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  Tags,
  User,
  Users,
  Bell,
  Zap,
  Wallet,
  Receipt,
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
        { to: '/buyer/feed', label: 'Feed', icon: LayoutGrid },
        { to: '/buyer/dashboard', label: 'Ofertas', icon: LayoutList },
        { to: '/buyer/demands/new', label: 'Solicitar oferta', icon: PlusCircle },
        { to: '/buyer/orders', label: 'Pedidos', icon: Package },
      ],
    },
    {
      title: 'Conta',
      items: [
        { to: '/support', label: 'Suporte', icon: Headset },
        { to: '/settings/billing', label: 'Plano', icon: CreditCard },
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/buyer/feed', icon: LayoutGrid, label: 'Feed' },
      { to: '/buyer/dashboard', icon: LayoutList, label: 'Ofertas' },
    ],
    right: [
      { to: '/buyer/orders', icon: Package, label: 'Pedidos' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/buyer/demands/new', icon: PlusCircle, label: 'Solicitar' },
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
        { to: '/supplier/auto-offers', label: 'Auto-proposta', icon: Zap },
        { to: '/support', label: 'Suporte', icon: Headset },
        { to: '/settings/billing', label: 'Plano', icon: CreditCard },
        { to: '/settings/profile', label: 'Configurações', icon: Settings },
        { to: '/notifications', label: 'Notificações', icon: Bell },
      ],
    },
  ],
  bottomNav: {
    left: [
      { to: '/supplier/board', icon: LayoutGrid, label: 'Oportunidades', hasNotification: true },
      { to: '/supplier/catalog', icon: Boxes, label: 'Catálogo' },
    ],
    right: [
      { to: '/supplier/orders', icon: Package, label: 'Pedidos' },
      { to: '/settings/profile', icon: User, label: 'Perfil' },
    ],
    fab: { to: '/supplier/board', icon: LayoutGrid, label: 'Oportunidades' },
  },
}

export const adminNav: RoleNavConfig = {
  sections: [
    {
      title: 'Operação',
      items: [
        { to: '/admin/metrics', label: 'Métricas', icon: BarChart3 },
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
