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
}

export function productMatchesDemandVariants(
  product: ProductVariantFields,
  demand: DemandVariantFields,
): boolean {
  const cor = demand.cor?.trim() ?? ''
  const tamanho = demand.tamanho?.trim() ?? ''

  const colorOk =
    !cor || !product.tem_cor || variantArrayContains(product.cores, cor)

  const sizeOk =
    !tamanho || !product.tem_tamanho || variantArrayContains(product.tamanhos, tamanho)

  return colorOk && sizeOk
}

export function demandHasVariantSpecs(demand: DemandVariantFields): boolean {
  return Boolean(demand.cor?.trim() || demand.tamanho?.trim())
}

export function formatDemandVariantSummary(demand: DemandVariantFields): string | null {
  const parts: string[] = []
  const cor = demand.cor?.trim()
  const tamanho = demand.tamanho?.trim()
  if (cor) parts.push(`Cor: ${cor}`)
  if (tamanho) parts.push(`Tamanho: ${tamanho}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
