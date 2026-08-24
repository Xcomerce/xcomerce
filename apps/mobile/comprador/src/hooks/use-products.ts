import { useQuery } from '@tanstack/react-query'
import * as products from '@/services/products'

export const productKeys = {
  all: ['products'] as const,
  feed: (filters?: object) => [...productKeys.all, 'feed', filters ?? {}] as const,
  suggestions: (query: string) => [...productKeys.all, 'suggestions', query] as const,
}

export function useFeedProducts(filters?: {
  categoryId?: string
  categoryIds?: string[]
  search?: string
  uf?: string
  cidades?: Array<{ cidade: string; uf: string }>
}) {
  return useQuery({
    queryKey: productKeys.feed(filters),
    queryFn: () => products.fetchFeedProducts(filters),
  })
}

export function useSearchSuggestions(query: string, enabled = true) {
  return useQuery({
    queryKey: productKeys.suggestions(query),
    queryFn: () => products.fetchSearchSuggestions(query),
    enabled: enabled && query.trim().length >= 1,
    staleTime: 30_000,
  })
}
