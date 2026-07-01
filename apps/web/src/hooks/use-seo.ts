import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  buildCanonicalUrl,
  buildOgImageUrl,
  resolveSeoConfig,
  getSiteUrl,
  type SeoConfig,
} from '@/config/seo'

const SITE_NAME = 'XCOMERCE'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo-jsonld="${id}"]`)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-seo-jsonld', id)
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd(id: string) {
  document.head.querySelector(`script[data-seo-jsonld="${id}"]`)?.remove()
}

function applySeo(config: SeoConfig) {
  const canonical = buildCanonicalUrl(config.path)
  const ogImage = buildOgImageUrl(config.ogImage ?? '/og-image.png')
  const title = config.title

  document.title = title

  upsertMeta('name', 'description', config.description)
  upsertMeta('name', 'robots', config.noIndex ? 'noindex, nofollow' : 'index, follow')
  if (config.keywords?.length) {
    upsertMeta('name', 'keywords', config.keywords.join(', '))
  }

  upsertLink('canonical', canonical)

  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', config.description)
  upsertMeta('property', 'og:url', canonical)
  upsertMeta('property', 'og:type', config.ogType ?? 'website')
  upsertMeta('property', 'og:image', ogImage)
  upsertMeta('property', 'og:image:width', '1200')
  upsertMeta('property', 'og:image:height', '630')
  upsertMeta('property', 'og:image:alt', `${SITE_NAME} — Marketplace B2B de busca reversa`)
  upsertMeta('property', 'og:locale', 'pt_BR')

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', config.description)
  upsertMeta('name', 'twitter:image', ogImage)
  upsertMeta('name', 'twitter:image:alt', `${SITE_NAME} — Marketplace B2B de busca reversa`)
}

function applyLandingJsonLd() {
  const siteUrl = getSiteUrl()

  upsertJsonLd('organization', {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo-dark.svg`,
    description:
      'Plataforma B2B de busca reversa que conecta compradores a fornecedores verificados por categoria e localização.',
  })

  upsertJsonLd('website', {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    description:
      'Encontre fornecedores para seus pedidos em minutos. Publique demandas, compare propostas e feche pedidos com integridade.',
    inLanguage: 'pt-BR',
  })

  upsertJsonLd('software', {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      description: 'Plano gratuito disponível com upgrade para Pro e Gold',
    },
    description:
      'Marketplace B2B com busca reversa, match geográfico, chat contextual e workflow de pedidos.',
  })
}

export function useSeo(): SeoConfig {
  const { pathname } = useLocation()
  const config = resolveSeoConfig(pathname)

  useEffect(() => {
    applySeo(config)

    const isPublicLanding = ['/', '/para-compradores', '/para-fornecedores', '/pricing'].includes(pathname)
    if (isPublicLanding) {
      applyLandingJsonLd()
    } else {
      removeJsonLd('organization')
      removeJsonLd('website')
      removeJsonLd('software')
    }
  }, [config, pathname])

  return config
}
