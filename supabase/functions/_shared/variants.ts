import {
  normalizeVariantValue,
  variantArrayContains,
} from '../utils/variant-normalize'
import type { VariantAxis } from '../utils/variant-axes'

export type ProductVariantFields = {
  tem_cor: boolean
  tem_tamanho: boolean
  cores: string[]
  tamanhos: string[]
  variant_axes?: VariantAxis[]
}

export type DemandVariantFields = {
  cor?: string | null
  tamanho?: string | null
  especificacoes?: Array<{
    cor?: string
    tamanho?: string
    values?: Record<string, string>
    quantidade?: number
  }> | null
}

function getProductAxes(product: ProductVariantFields): VariantAxis[] {
  if (product.variant_axes?.length) return product.variant_axes

  const axes: VariantAxis[] = []
  if (product.tem_cor && product.cores.length > 0) {
    axes.push({ name: 'Cor', options: product.cores })
  }
  if (product.tem_tamanho && product.tamanhos.length > 0) {
    axes.push({ name: 'Tamanho', options: product.tamanhos })
  }
  return axes
}

function specValues(spec: NonNullable<DemandVariantFields['especificacoes']>[number]): Record<string, string> {
  if (spec.values && Object.keys(spec.values).length > 0) return spec.values
  const values: Record<string, string> = {}
  if (spec.cor?.trim()) values.Cor = spec.cor.trim()
  if (spec.tamanho?.trim()) values.Tamanho = spec.tamanho.trim()
  return values
}

export function productMatchesDemandSpec(
  product: ProductVariantFields,
  specValues: Record<string, string>,
): boolean {
  const axes = getProductAxes(product)
  if (axes.length === 0) return true

  for (const [axisName, axisValue] of Object.entries(specValues)) {
    const normalizedValue = normalizeVariantValue(axisValue)
    if (!normalizedValue) continue

    const axis = axes.find((a) => normalizeVariantValue(a.name) === normalizeVariantValue(axisName))
    if (!axis) continue

    if (!variantArrayContains(axis.options, axisValue)) return false
  }

  return true
}

export function productMatchesDemandVariants(
  product: ProductVariantFields,
  demand: DemandVariantFields,
): boolean {
  const specs = (demand.especificacoes ?? []).filter((spec) => {
    const values = specValues(spec)
    return Object.values(values).some((v) => v.trim()) || spec.cor?.trim() || spec.tamanho?.trim()
  })

  if (specs.length === 0) {
    const cor = demand.cor?.trim() ?? ''
    const tamanho = demand.tamanho?.trim() ?? ''
    if (!cor && !tamanho) return true
    return productMatchesDemandSpec(product, {
      ...(cor ? { Cor: cor } : {}),
      ...(tamanho ? { Tamanho: tamanho } : {}),
    })
  }

  return specs.some((spec) => productMatchesDemandSpec(product, specValues(spec)))
}

export function demandHasVariantSpecs(demand: DemandVariantFields): boolean {
  if ((demand.especificacoes ?? []).some((spec) => Object.values(specValues(spec)).some((v) => v.trim()))) {
    return true
  }
  return Boolean(demand.cor?.trim() || demand.tamanho?.trim())
}

export { normalizeVariantValue, variantArrayContains }
