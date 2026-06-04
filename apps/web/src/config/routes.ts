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
  '/buyer/feed': 'Feed',
  '/buyer/dashboard': 'Ofertas',
  '/buyer/demands/new': 'Solicitar oferta',
  '/buyer/orders': 'Pedidos',
  '/supplier/board': 'Oportunidades',
  '/supplier/onboarding': 'Onboarding',
  '/supplier/catalog': 'Catálogo',
  '/supplier/catalog/new': 'Novo produto',
  '/supplier/orders': 'Pedidos',
  '/admin/approvals': 'Aprovações',
  '/admin/metrics': 'Métricas',
  '/admin/categories': 'Categorias',
  '/admin/audit': 'Auditoria',
  '/settings/profile': 'Configurações',
  '/settings/billing': 'Plano e billing',
  '/notifications': 'Notificações',
}

export function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/buyer/demands/') && pathname.endsWith('/auction')) return 'Ofertas'
  if (pathname.startsWith('/buyer/demands/')) return 'Detalhe da demanda'
  if (pathname.startsWith('/buyer/orders/')) return 'Detalhe do pedido'
  if (pathname.startsWith('/supplier/offers/')) return 'Proposta'
  if (pathname.startsWith('/supplier/catalog/') && pathname.endsWith('/edit')) return 'Editar produto'
  if (pathname.startsWith('/supplier/orders/')) return 'Detalhe do pedido'
  if (pathname.startsWith('/profile/')) return 'Perfil público'
  return 'X COMERCE'
}
