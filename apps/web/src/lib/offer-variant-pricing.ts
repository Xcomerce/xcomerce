import {
  normalizeDemandSpecifications,
  productMatchesDemandVariants,
  type DemandSpecification,
  type DemandVariantFields,
  type OfferSpecification,
} from '@keve/shared'
import { sumSpecificationQuantities } from '@/lib/demand-specifications'

export type OfferLineItem = {
  key: string
  cor: string
  tamanho: string
  quantidade: number
  quantidadeSolicitada: number
  precoUnitario: number
}

type OfferWithEspecificacoes = {
  valor: number
  quantidade: number
  especificacoes?: OfferSpecification[] | null
}

export function buildOfferLineItemsFromDemand(
  demand: DemandVariantFields & { quantidade?: number | null },
  defaultUnitPrice: number,
): OfferLineItem[] {
  const specs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )

  if (specs.length === 0) {
    const qty = Math.max(1, demand.quantidade ?? 1)
    return [
      {
        key: 'default',
        cor: '',
        tamanho: '',
        quantidade: qty,
        quantidadeSolicitada: qty,
        precoUnitario: defaultUnitPrice,
      },
    ]
  }

  return specs.map((spec, index) => {
    const qty = Math.max(1, spec.quantidade ?? 1)
    return {
      key: offerLineItemKey(spec, index),
      cor: spec.cor?.trim() ?? '',
      tamanho: spec.tamanho?.trim() ?? '',
      quantidade: qty,
      quantidadeSolicitada: qty,
      precoUnitario: defaultUnitPrice,
    }
  })
}

export function buildOfferLineItemsFromOffer(
  offer: OfferWithEspecificacoes,
  demand?: DemandVariantFields & { quantidade?: number | null },
): OfferLineItem[] {
  const specs = offer.especificacoes ?? []
  if (specs.length > 0) {
    return specs.map((spec, index) => ({
      key: offerLineItemKey(spec, index),
      cor: spec.cor?.trim() ?? '',
      tamanho: spec.tamanho?.trim() ?? '',
      quantidade: Math.max(1, spec.quantidade ?? 1),
      quantidadeSolicitada: Math.max(1, spec.quantidade ?? 1),
      precoUnitario: spec.preco_unitario,
    }))
  }

  if (!demand) return []

  const unitPrice =
    offer.quantidade > 0 ? roundCurrency(offer.valor / offer.quantidade) : offer.valor

  return buildOfferLineItemsFromDemand(demand, unitPrice)
}

export function offerLineItemsToEspecificacoes(items: OfferLineItem[]): OfferSpecification[] {
  return items.map((item) => ({
    cor: item.cor || undefined,
    tamanho: item.tamanho || undefined,
    values: {
      ...(item.cor ? { Cor: item.cor } : {}),
      ...(item.tamanho ? { Tamanho: item.tamanho } : {}),
    },
    quantidade: item.quantidade,
    preco_unitario: roundCurrency(item.precoUnitario),
  }))
}

export function isPartialOffer(
  items: OfferLineItem[],
  demand: DemandVariantFields & { quantidade?: number | null },
): boolean {
  const demandSpecs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )

  if (demandSpecs.length === 0) {
    const requestedQty = Math.max(1, demand.quantidade ?? 1)
    const offeredQty = sumOfferLineQuantity(items)
    return offeredQty < requestedQty
  }

  if (items.length < demandSpecs.length) return true

  const offeredByKey = new Map(
    items.map((item) => [`${item.cor}|${item.tamanho}`, item.quantidade]),
  )

  return demandSpecs.some((spec) => {
    const key = `${spec.cor?.trim() ?? ''}|${spec.tamanho?.trim() ?? ''}`
    const offeredQty = offeredByKey.get(key)
    if (offeredQty == null) return true
    return offeredQty < Math.max(1, spec.quantidade ?? 1)
  })
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

export type OfferVariantComparisonRow = {
  key: string
  cor: string
  tamanho: string
  quantidadeSolicitada: number
  quantidadeProposta: number | null
}

export function buildOfferVariantComparison(
  demand: DemandVariantFields & { quantidade?: number | null },
  offer: OfferWithEspecificacoes,
): OfferVariantComparisonRow[] {
  const demandSpecs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )

  const offerSpecs = offer.especificacoes ?? []
  if (offerSpecs.length === 0 || demandSpecs.length === 0) return []

  const offeredByKey = new Map<string, number>()
  for (const spec of offerSpecs) {
    const key = `${spec.cor?.trim() ?? ''}|${spec.tamanho?.trim() ?? ''}`
    offeredByKey.set(key, Math.max(1, spec.quantidade ?? 1))
  }

  return demandSpecs.map((spec, index) => {
    const key = `${spec.cor?.trim() ?? ''}|${spec.tamanho?.trim() ?? ''}`
    return {
      key: offerLineItemKey(spec, index),
      cor: spec.cor?.trim() ?? '',
      tamanho: spec.tamanho?.trim() ?? '',
      quantidadeSolicitada: Math.max(1, spec.quantidade ?? 1),
      quantidadeProposta: offeredByKey.get(key) ?? null,
    }
  })
}

export function isOfferQuantityPartial(
  demand: DemandVariantFields & { quantidade?: number | null },
  offer: OfferWithEspecificacoes,
): boolean {
  const requestedQty = getDemandRequestedQuantity(demand)
  return offer.quantidade < requestedQty
}

export function getDemandRequestedQuantity(
  demand: DemandVariantFields & { quantidade?: number | null },
): number {
  const specs = normalizeDemandSpecifications(demand)
  return sumSpecificationQuantities(specs, demand.quantidade ?? undefined)
}

export type BuyerOfferPartialStatus = {
  isPartial: boolean
  requestedQty: number
  offeredQty: number
  uncoveredQty: number
}

export function getBuyerOfferPartialStatus(
  demand: DemandVariantFields & { quantidade?: number | null },
  offer: OfferWithEspecificacoes,
): BuyerOfferPartialStatus {
  const requestedQty = getDemandRequestedQuantity(demand)
  const offeredQty = offer.quantidade
  const isPartial =
    offer.especificacoes && offer.especificacoes.length > 0
      ? isPartialOffer(buildOfferLineItemsFromOffer(offer, demand), demand)
      : isOfferQuantityPartial(demand, offer)

  return {
    isPartial,
    requestedQty,
    offeredQty,
    uncoveredQty: Math.max(0, requestedQty - offeredQty),
  }
}
