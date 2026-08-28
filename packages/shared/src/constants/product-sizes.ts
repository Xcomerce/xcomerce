import type { DemandSpecification } from '../validators/demands'
import {
  dedupeVariantValues,
  normalizeVariantValue,
  variantArrayContains,
} from '../utils/variant-normalize'

export type ProductSizeType = 'roupa' | 'calcado' | 'numerico' | 'livre'

export const PRODUCT_SIZE_TYPE_LABELS: Record<ProductSizeType, string> = {
  calcado: 'Calçado (numeração BR)',
  roupa: 'Roupa (P, M, G…)',
  numerico: 'Numérico',
  livre: 'Personalizado',
}

export const CLOTHING_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'] as const

/** Tokens de tamanho de 1 caractere aceitos na busca (espelha is_valid_search_size_token no Postgres). */
export const SEARCH_CLOTHING_SIZE_TOKENS = new Set(
  CLOTHING_SIZES.filter((size) => size.length === 1).map((size) => size.toLowerCase()),
)

export const DEFAULT_PRODUCT_COLORS = [
  'Preto',
  'Branco',
  'Azul',
  'Azul Marinho',
  'Vermelho',
  'Verde',
  'Amarelo',
  'Cinza',
  'Bege',
  'Rosa',
  'Marrom',
  'Nude',
] as const

/** Numeração BR inteira (33–48). */
export const SHOE_SIZES_BR = Array.from({ length: 16 }, (_, i) => String(33 + i))

/** Meios números BR (33.5–47.5). */
export const SHOE_HALF_SIZES_BR = Array.from({ length: 15 }, (_, i) => `${33 + i}.5`)

export {
  dedupeVariantValues,
  normalizeVariantValue,
  variantArrayContains,
  variantValuesEqual,
} from '../utils/variant-normalize'

export function resolveColorOptions(catalogColors: string[] | undefined, currentValue?: string): string[] {
  const base = catalogColors?.length ? dedupeVariantValues(catalogColors) : [...DEFAULT_PRODUCT_COLORS]
  const trimmed = currentValue?.trim()
  if (trimmed && !variantArrayContains(base, trimmed)) {
    return [trimmed, ...base]
  }
  return base
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
  especificacoes?: Array<{
    cor?: string | null
    tamanho?: string | null
    values?: Record<string, string>
    quantidade?: number | null
  }> | null
}

export type DemandSpecificationGroup = {
  cor: string
  items: DemandSpecification[]
}

export function groupDemandSpecificationsByColor(
  demand: DemandVariantFields,
): DemandSpecificationGroup[] {
  const specs = normalizeDemandSpecifications(demand).filter(
    (spec) => spec.cor || spec.tamanho || (spec.quantidade ?? 0) > 0,
  )
  if (specs.length === 0) return []

  const groups: DemandSpecificationGroup[] = []
  const groupIndexByColor = new Map<string, number>()

  for (const spec of specs) {
    const cor = spec.cor?.trim() ?? ''
    const key = cor ? normalizeVariantValue(cor) : '__sem_cor__'
    let groupIndex = groupIndexByColor.get(key)

    if (groupIndex === undefined) {
      groupIndex = groups.length
      groupIndexByColor.set(key, groupIndex)
      groups.push({ cor, items: [] })
    }

    groups[groupIndex].items.push(spec)
  }

  return groups
}

export function normalizeDemandSpecifications(demand: DemandVariantFields): Array<{
  cor: string
  tamanho: string
  values: Record<string, string>
  quantidade?: number
}> {
  if (Array.isArray(demand.especificacoes) && demand.especificacoes.length > 0) {
    return demand.especificacoes.map((spec) => ({
      cor: spec.cor?.trim() ?? spec.values?.Cor?.trim() ?? '',
      tamanho: spec.tamanho?.trim() ?? spec.values?.Tamanho?.trim() ?? '',
      values: spec.values ?? {},
      quantidade:
        typeof spec.quantidade === 'number' && spec.quantidade > 0 ? spec.quantidade : undefined,
    }))
  }

  const cor = demand.cor?.trim() ?? ''
  const tamanho = demand.tamanho?.trim() ?? ''
  if (cor || tamanho) {
    return [{
      cor,
      tamanho,
      values: { ...(cor ? { Cor: cor } : {}), ...(tamanho ? { Tamanho: tamanho } : {}) },
      quantidade: undefined,
    }]
  }

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
