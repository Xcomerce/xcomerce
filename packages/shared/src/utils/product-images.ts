export type ProductImageSource = {
  image_url?: string | null
  image_urls?: string[] | null
}

export function getProductImageUrls(product: ProductImageSource): string[] {
  const urls = (product.image_urls ?? []).map((url) => url?.trim()).filter(Boolean) as string[]
  if (urls.length > 0) return urls
  const primary = product.image_url?.trim()
  return primary ? [primary] : []
}

export function getPrimaryProductImageUrl(product: ProductImageSource): string | null {
  return getProductImageUrls(product)[0] ?? null
}
