import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as products from '@/services/products'
import type { ProductInput } from '@keve/shared'

export const productKeys = {
  all: ['products'] as const,
  list: (supplierId: string) => [...productKeys.all, 'list', supplierId] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  count: (supplierId: string) => [...productKeys.all, 'count', supplierId] as const,
  feed: (filters?: object) => [...productKeys.all, 'feed', filters ?? {}] as const,
}

export function useProducts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: productKeys.list(user?.id ?? ''),
    queryFn: () => products.fetchProducts(user!.id),
    enabled: !!user?.id,
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => products.fetchProduct(id!),
    enabled: !!id,
  })
}

export function useProductCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: productKeys.count(user?.id ?? ''),
    queryFn: () => products.countProducts(user!.id),
    enabled: !!user?.id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: ProductInput) => products.createProduct(user!.id, input),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: productKeys.list(user.id) })
        queryClient.invalidateQueries({ queryKey: productKeys.count(user.id) })
      }
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      products.updateProduct(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(data.id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: productKeys.list(user.id) })
      }
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => products.deleteProduct(id),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: productKeys.list(user.id) })
        queryClient.invalidateQueries({ queryKey: productKeys.count(user.id) })
      }
    },
  })
}

export function useFeedProducts(filters?: { categoryId?: string; search?: string; uf?: string }) {
  return useQuery({
    queryKey: productKeys.feed(filters),
    queryFn: () => products.fetchFeedProducts(filters),
  })
}
