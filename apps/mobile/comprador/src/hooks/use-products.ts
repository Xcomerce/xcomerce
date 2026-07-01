import { useQuery } from '@tanstack/react-query'
import * as products from '@/services/products'

export const productKeys = {
  all: ['products'] as const,
  feed: (filters?: object) => [...productKeys.all, 'feed', filters ?? {}] as const,
}

export function useFeedProducts(filters?: { categoryId?: string; search?: string; uf?: string }) {
  return useQuery({
    queryKey: productKeys.feed(filters),
    queryFn: () => products.fetchFeedProducts(filters),
  })
}
