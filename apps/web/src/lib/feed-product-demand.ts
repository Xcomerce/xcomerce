import type { ProductSizeType } from '@keve/shared'
import type { FeedProduct } from '@/services/products'

export type FeedProductVariantSelection = {
  cor: string | null
  tamanho: string | null
}

export type FeedProductDemandState = {
  categoryId: string
  title: string
  description: string
  city: string
  uf: string
  precoReferencia: number | null
  temCor: boolean
  temTamanho: boolean
  tipoTamanho: ProductSizeType | null
  cores: string[]
  tamanhos: string[]
  selectedCor?: string
  selectedTamanho?: string
}

export function buildDemandStateFromProduct(
  product: FeedProduct,
  variant?: FeedProductVariantSelection | null,
): FeedProductDemandState {
  const selectedCor = variant?.cor?.trim() || undefined
  const selectedTamanho = variant?.tamanho?.trim() || undefined

  return {
    categoryId: product.category_id,
    title: product.nome,
    description: product.descricao || '',
    city: product.cidade || '',
    uf: product.uf || '',
    precoReferencia: product.preco_referencia,
    temCor: product.tem_cor,
    temTamanho: product.tem_tamanho,
    tipoTamanho: product.tipo_tamanho,
    cores: product.cores ?? [],
    tamanhos: product.tamanhos ?? [],
    selectedCor,
    selectedTamanho,
  }
}
