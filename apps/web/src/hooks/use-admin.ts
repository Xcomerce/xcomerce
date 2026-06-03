import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as admin from '@/services/admin'
import type { AuditLogFilters, CategoryInput } from '@/services/admin'
import { categoryKeys } from '@/hooks/use-categories'

export const adminKeys = {
  all: ['admin'] as const,
  pendingSuppliers: () => [...adminKeys.all, 'pending-suppliers'] as const,
  metrics: () => [...adminKeys.all, 'metrics'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  auditLogs: (filters?: AuditLogFilters) => [...adminKeys.all, 'audit', filters ?? {}] as const,
}

export function usePendingSuppliers() {
  return useQuery({
    queryKey: adminKeys.pendingSuppliers(),
    queryFn: admin.fetchPendingSuppliers,
  })
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: adminKeys.metrics(),
    queryFn: admin.fetchMetrics,
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: admin.fetchCategoriesAdmin,
  })
}

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn: () => admin.fetchAuditLogs(filters),
  })
}

export function useApproveSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => admin.approveSupplier(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingSuppliers() })
      queryClient.invalidateQueries({ queryKey: adminKeys.metrics() })
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() })
    },
  })
}

export function useRejectSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      admin.rejectSupplier(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingSuppliers() })
      queryClient.invalidateQueries({ queryKey: adminKeys.metrics() })
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() })
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CategoryInput) => admin.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      admin.updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => admin.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.list() })
    },
  })
}
