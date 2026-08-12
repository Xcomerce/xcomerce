import { useQuery } from '@tanstack/react-query'
import { fetchCategories, fetchRootCategories } from '@/services/categories'

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  roots: () => [...categoryKeys.all, 'roots'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  })
}

export function useRootCategories() {
  return useQuery({
    queryKey: categoryKeys.roots(),
    queryFn: fetchRootCategories,
    staleTime: 5 * 60_000,
  })
}
