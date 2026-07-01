export function normalizeVariantValue(value: string): string {
  return value.trim().toLowerCase()
}

export function variantArrayContains(values: string[], needle: string): boolean {
  const normalized = normalizeVariantValue(needle)
  if (!normalized) return false
  return (values ?? []).some((v) => normalizeVariantValue(v) === normalized)
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

  const colorOk = !cor || !product.tem_cor || variantArrayContains(product.cores, cor)
  const sizeOk =
    !tamanho || !product.tem_tamanho || variantArrayContains(product.tamanhos, tamanho)

  return colorOk && sizeOk
}

export function demandHasVariantSpecs(demand: DemandVariantFields): boolean {
  return Boolean(demand.cor?.trim() || demand.tamanho?.trim())
}
