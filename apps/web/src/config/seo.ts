const DEFAULT_SITE_URL = 'https://xcomerce.com.br'

export function getSiteUrl(): string {
  const envUrl = import.meta.env.VITE_SITE_URL as string | undefined
  return (envUrl ?? DEFAULT_SITE_URL).replace(/\/$/, '')
}

export type SeoConfig = {
  title: string
  description: string
  path: string
  ogImage?: string
  ogType?: 'website' | 'article'
  noIndex?: boolean
  keywords?: string[]
}

const DEFAULT_DESCRIPTION =
  'Plataforma B2B de busca reversa: publique sua demanda e receba propostas de fornecedores verificados na sua região. Cotações, chat e pedidos em um só lugar.'

const DEFAULT_KEYWORDS = [
  'marketplace B2B',
  'fornecedores',
  'cotação',
  'compradores',
  'busca reversa',
  'XCOMERCE',
  'procurement',
  'supply chain',
]

export const SEO_CONFIG: Record<string, SeoConfig> = {
  '/': {
    title: 'XCOMERCE — Encontre fornecedores para seus pedidos em minutos',
    description: DEFAULT_DESCRIPTION,
    path: '/',
    ogImage: '/og-image.png',
    keywords: DEFAULT_KEYWORDS,
  },
  '/para-compradores': {
    title: 'Para compradores — Cotações e fornecedores na sua região',
    description:
      'Publique demandas, compare propostas na mesma tela e negocie com fornecedores verificados. Centralize cotações B2B com chat, SLAs e reputação.',
    path: '/para-compradores',
    ogImage: '/og-image.png',
    keywords: [...DEFAULT_KEYWORDS, 'cotação online', 'comprador B2B'],
  },
  '/para-fornecedores': {
    title: 'Para fornecedores — Oportunidades qualificadas na sua região',
    description:
      'Receba demandas compatíveis com seu catálogo e localização. Envie propostas, construa reputação e ganhe visibilidade com planos Gold.',
    path: '/para-fornecedores',
    ogImage: '/og-image.png',
    keywords: [...DEFAULT_KEYWORDS, 'vendas B2B', 'leads qualificados', 'fornecedor'],
  },
  '/pricing': {
    title: 'Planos e preços — Assinatura SaaS com trial de 14 dias',
    description:
      'Planos Free, Pro e Gold para compradores e fornecedores. Trial de 14 dias nos planos pagos. Limites de demandas, propostas e catálogo transparentes.',
    path: '/pricing',
    ogImage: '/og-image.png',
    keywords: [...DEFAULT_KEYWORDS, 'planos', 'preços', 'SaaS B2B'],
  },
}

export function resolveSeoConfig(pathname: string): SeoConfig {
  if (SEO_CONFIG[pathname]) return SEO_CONFIG[pathname]

  return {
    title: 'XCOMERCE — Marketplace B2B de busca reversa',
    description: DEFAULT_DESCRIPTION,
    path: pathname,
    ogImage: '/og-image.png',
    keywords: DEFAULT_KEYWORDS,
  }
}

export function buildCanonicalUrl(path: string): string {
  const base = getSiteUrl()
  if (path === '/') return base
  return `${base}${path}`
}

export function buildOgImageUrl(ogImage: string): string {
  if (ogImage.startsWith('http')) return ogImage
  return `${getSiteUrl()}${ogImage}`
}
