export const PAGE_TITLES: Record<string, string> = {
  '/': 'X COMERCE',
  '/para-compradores': 'Para compradores',
  '/para-fornecedores': 'Para fornecedores',
  '/pricing': 'Planos e preços',
  '/auth/login': 'Entrar',
  '/auth/register/buyer': 'Cadastro comprador',
  '/auth/register/supplier': 'Cadastro fornecedor',
  '/auth/forgot-password': 'Recuperar senha',
  '/auth/reset-password': 'Nova senha',
  '/auth/select-role': 'Escolher perfil',
  '/buyer/feed': 'Explorar',
  '/buyer/dashboard': 'Minhas solicitações',
  '/buyer/demands/new': 'Nova solicitação',
  '/buyer/orders': 'Meus pedidos',
  '/supplier/board': 'Solicitações de compra',
  '/supplier/onboarding': 'Cadastro',
  '/supplier/catalog': 'Meus produtos',
  '/supplier/catalog/new': 'Novo produto',
  '/supplier/orders': 'Pedidos',
  '/supplier/auto-offers': 'Auto-proposta',
  '/admin/approvals': 'Aprovações',
  '/admin/metrics': 'Métricas',
  '/admin/financial-reports': 'Relatórios',
  '/admin/plans': 'Planos',
  '/admin/subscriptions': 'Assinaturas',
  '/admin/users': 'Usuários',
  '/admin/leads': 'Leads',
  '/admin/email-templates': 'E-mails',
  '/admin/email-providers': 'Provedores',
  '/admin/categories': 'Categorias',
  '/admin/support-settings': 'Contatos de suporte',
  '/admin/audit': 'Auditoria',
  '/email/unsubscribe': 'Cancelar e-mails',
  '/settings/profile': 'Configurações',
  '/settings/billing': 'Plano e billing',
  '/notifications': 'Notificações',
  '/support': 'Suporte',
}

export function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/admin/leads/')) return 'Detalhe do lead'
  if (pathname.startsWith('/buyer/demands/')) return 'Detalhe da demanda'
  if (pathname.startsWith('/buyer/orders/')) return 'Detalhe do pedido'
  if (pathname.startsWith('/supplier/offers/')) return 'Proposta'
  if (pathname.startsWith('/supplier/catalog/') && pathname.endsWith('/edit')) return 'Editar produto'
  if (pathname.startsWith('/supplier/orders/')) return 'Detalhe do pedido'
  if (pathname.startsWith('/profile/')) return 'Perfil público'
  return 'X COMERCE'
}
