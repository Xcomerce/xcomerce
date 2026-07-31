import { useQuery } from '@tanstack/react-query'
import { fetchCategories, type Category } from '@/services/categories'

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  })
}

export type { Category }
