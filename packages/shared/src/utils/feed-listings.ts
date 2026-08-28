import { getPrimaryProductImageUrl, type ProductImageSource } from './product-images'
import { normalizeVariantValue } from './variant-normalize'
import { countCombinations, normalizeVariantAxes, type VariantAxis } from './variant-axes'

export type FeedListingFields = {
  feedListingKey: string
  feedColor: string | null
  feedColorImageUrl: string | null
  feedVariationCount: number
}

export type ProductWithVariantListing = ProductImageSource & {
  id: string
  tem_cor?: boolean
  cores?: string[] | null
  tem_tamanho?: boolean
  tamanhos?: string[] | null
  variant_axes?: VariantAxis[] | null
  estoque_variacoes?: unknown[] | null
}

function parseVariantAxes(raw: unknown): VariantAxis[] {
  if (!Array.isArray(raw)) return []
  return raw as VariantAxis[]
}

export function findColorAxis(axes: VariantAxis[]): VariantAxis | undefined {
  return axes.find((axis) => ['cor', 'cores'].includes(normalizeVariantValue(axis.name)))
}

export function getProductColorOptions(product: ProductWithVariantListing): string[] {
  const axes = parseVariantAxes(product.variant_axes)
  const colorAxis = findColorAxis(axes)
  if (colorAxis?.options?.length) {
    return colorAxis.options.map((option) => option.trim()).filter(Boolean)
  }
  if (product.tem_cor && product.cores?.length) {
    return product.cores.map((option) => option.trim()).filter(Boolean)
  }
  return []
}

export function getColorOptionImageUrl(product: ProductWithVariantListing, color: string): string | null {
  const axes = parseVariantAxes(product.variant_axes)
  const colorAxis = findColorAxis(axes) ?? axes[0]

  if (colorAxis?.images) {
    const direct = colorAxis.images[color]?.trim()
    if (direct) return direct

    const matched = Object.entries(colorAxis.images).find(
      ([key]) => normalizeVariantValue(key) === normalizeVariantValue(color),
    )
    if (matched?.[1]?.trim()) return matched[1].trim()
  }

  return getPrimaryProductImageUrl(product)
}

export function getProductVariationCount(product: ProductWithVariantListing): number {
  const stockRows = product.estoque_variacoes
  if (Array.isArray(stockRows) && stockRows.length > 0) {
    return stockRows.length
  }

  const axes = normalizeVariantAxes(parseVariantAxes(product.variant_axes))
  const axisCount = countCombinations(axes)
  if (axisCount > 0) {
    return axisCount
  }

  let count = 1
  let hasAxis = false

  if (product.tem_cor && product.cores?.length) {
    count *= product.cores.map((option) => option.trim()).filter(Boolean).length
    hasAxis = true
  }
  if (product.tem_tamanho && product.tamanhos?.length) {
    count *= product.tamanhos.map((option) => option.trim()).filter(Boolean).length
    hasAxis = true
  }

  return hasAxis ? count : 0
}

export function formatVariationOptionLabel(count: number): string {
  return count === 1 ? '1 opção' : `${count} opções`
}

export function expandProductsToFeedListings<T extends ProductWithVariantListing>(
  products: T[],
): Array<T & FeedListingFields> {
  const listings: Array<T & FeedListingFields> = []

  for (const product of products) {
    const colors = getProductColorOptions(product)
    const feedVariationCount = getProductVariationCount(product)

    if (colors.length <= 1) {
      const color = colors[0] ?? null
      listings.push({
        ...product,
        feedListingKey: product.id,
        feedColor: color,
        feedColorImageUrl: color ? getColorOptionImageUrl(product, color) : null,
        feedVariationCount,
      })
      continue
    }

    for (const color of colors) {
      listings.push({
        ...product,
        feedListingKey: `${product.id}::${color}`,
        feedColor: color,
        feedColorImageUrl: getColorOptionImageUrl(product, color),
        feedVariationCount,
      })
    }
  }

  return listings
}
