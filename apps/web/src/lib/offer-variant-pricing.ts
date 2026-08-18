import {
  normalizeDemandSpecifications,
  productMatchesDemandVariants,
  type DemandSpecification,
  type DemandVariantFields,
} from '@keve/shared'

export type OfferLineItem = {
  key: string
  cor: string
  tamanho: string
  quantidade: number
  precoUnitario: number
}

export function buildOfferLineItemsFromDemand(
  demand: DemandVariantFields & { quantidade?: number | null },
  defaultUnitPrice: number,
): OfferLineItem[] {
  const specs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )

  if (specs.length === 0) {
    return [
      {
        key: 'default',
        cor: '',
        tamanho: '',
        quantidade: Math.max(1, demand.quantidade ?? 1),
        precoUnitario: defaultUnitPrice,
      },
    ]
  }

  return specs.map((spec, index) => ({
    key: offerLineItemKey(spec, index),
    cor: spec.cor?.trim() ?? '',
    tamanho: spec.tamanho?.trim() ?? '',
    quantidade: Math.max(1, spec.quantidade ?? 1),
    precoUnitario: defaultUnitPrice,
  }))
}

export function offerLineItemKey(spec: DemandSpecification, index: number): string {
  return `${spec.cor ?? ''}|${spec.tamanho ?? ''}|${index}`
}

export function sumOfferLineQuantity(items: OfferLineItem[]): number {
  return items.reduce((total, item) => total + item.quantidade, 0)
}

export function sumOfferLineTotal(items: OfferLineItem[]): number {
  return items.reduce((total, item) => total + item.quantidade * item.precoUnitario, 0)
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

type CatalogProduct = {
  preco_referencia: number | null
  tem_cor: boolean
  tem_tamanho: boolean
  cores: string[]
  tamanhos: string[]
  nome: string
}

export function pickBestCatalogUnitPrice(
  products: CatalogProduct[],
  demand: DemandVariantFields & { titulo?: string | null },
  fallbackPrice: number | null,
): number {
  const priced = products.filter(
    (product) => product.preco_referencia != null && product.preco_referencia > 0,
  )

  if (priced.length === 0) {
    return fallbackPrice ?? 0
  }

  const compatible = priced.filter((product) =>
    productMatchesDemandVariants(
      {
        tem_cor: product.tem_cor,
        tem_tamanho: product.tem_tamanho,
        cores: product.cores,
        tamanhos: product.tamanhos,
      },
      demand,
    ),
  )

  const title = demand.titulo?.trim().toLowerCase() ?? ''
  const titleMatch = compatible.find((product) => {
    const name = product.nome.trim().toLowerCase()
    return title && (name.includes(title) || title.includes(name))
  })

  const selected = titleMatch ?? compatible[0] ?? priced[0]
  return selected?.preco_referencia ?? fallbackPrice ?? 0
}
