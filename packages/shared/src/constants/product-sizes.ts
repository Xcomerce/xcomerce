import type { DemandSpecification } from '../validators/demands'

export type ProductSizeType = 'roupa' | 'calcado' | 'numerico' | 'livre'

export const PRODUCT_SIZE_TYPE_LABELS: Record<ProductSizeType, string> = {
  calcado: 'Calçado (numeração BR)',
  roupa: 'Roupa (P, M, G…)',
  numerico: 'Numérico',
  livre: 'Personalizado',
}

export const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'] as const

/** Numeração BR inteira (33–48). */
export const SHOE_SIZES_BR = Array.from({ length: 16 }, (_, i) => String(33 + i))

/** Meios números BR (33.5–47.5). */
export const SHOE_HALF_SIZES_BR = Array.from({ length: 15 }, (_, i) => `${33 + i}.5`)

export function normalizeVariantValue(value: string): string {
  return value.trim().toLowerCase()
}

export function variantArrayContains(values: string[], needle: string): boolean {
  const normalized = normalizeVariantValue(needle)
  if (!normalized) return false
  return values.some((v) => normalizeVariantValue(v) === normalized)
}

export function dedupeVariantValues(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeVariantValue(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export function sortSizeValues(values: string[], tipo: ProductSizeType | null | undefined): string[] {
  const deduped = dedupeVariantValues(values)
  if (tipo === 'calcado' || tipo === 'numerico') {
    return [...deduped].sort((a, b) => parseFloat(a) - parseFloat(b))
  }
  return deduped
}

export function isValidShoeSize(value: string, allowHalf = false): boolean {
  const trimmed = value.trim()
  if (!/^\d+(\.5)?$/.test(trimmed)) return false
  const num = parseFloat(trimmed)
  if (num < 33 || num > 48) return false
  if (!allowHalf && trimmed.includes('.')) return false
  if (trimmed.includes('.') && !trimmed.endsWith('.5')) return false
  return true
}

export type ProductVariantFields = {
  tem_cor: boolean
  tem_tamanho: boolean
  cores: string[]
  tamanhos: string[]
}

export type DemandVariantFields = {
  cor?: string | null
  tamanho?: string | null
  especificacoes?: DemandSpecification[] | null
}

export function normalizeDemandSpecifications(demand: DemandVariantFields): DemandSpecification[] {
  if (Array.isArray(demand.especificacoes) && demand.especificacoes.length > 0) {
    return demand.especificacoes.map((spec) => ({
      cor: spec.cor?.trim() ?? '',
      tamanho: spec.tamanho?.trim() ?? '',
      quantidade: spec.quantidade ?? 1,
    }))
  }

  const cor = demand.cor?.trim() ?? ''
  const tamanho = demand.tamanho?.trim() ?? ''
  if (cor || tamanho) return [{ cor, tamanho, quantidade: 1 }]

  return []
}

export function productMatchesDemandVariants(
  product: ProductVariantFields,
  demand: DemandVariantFields,
): boolean {
  const specs = normalizeDemandSpecifications(demand).filter((spec) => spec.cor || spec.tamanho)
  if (specs.length === 0) return true

  return specs.some((spec) => {
    const colorOk =
      !spec.cor || !product.tem_cor || variantArrayContains(product.cores, spec.cor)
    const sizeOk =
      !spec.tamanho || !product.tem_tamanho || variantArrayContains(product.tamanhos, spec.tamanho)
    return colorOk && sizeOk
  })
}

export function demandHasVariantSpecs(demand: DemandVariantFields): boolean {
  return normalizeDemandSpecifications(demand).some((spec) => spec.cor || spec.tamanho)
}

export function formatDemandVariantSummary(demand: DemandVariantFields): string | null {
  const specs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )
  if (specs.length === 0) return null

  return specs
    .map((spec) => {
      const parts: string[] = []
      if (spec.cor) parts.push(`Cor: ${spec.cor}`)
      if (spec.tamanho) parts.push(`Tamanho: ${spec.tamanho}`)
      if (spec.quantidade != null && spec.quantidade > 0) {
        parts.push(`Qtd: ${spec.quantidade}`)
      }
      return parts.join(' · ')
    })
    .filter(Boolean)
    .join(' | ')
}
