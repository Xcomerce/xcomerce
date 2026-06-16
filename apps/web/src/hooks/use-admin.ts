import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as admin from '@/services/admin'
import type { AuditLogFilters, CategoryInput, MetricsPeriod, PlanInput, SubscriptionFilters, UpdateSubscriptionInput } from '@/services/admin'
import { categoryKeys } from '@/hooks/use-categories'

export const adminKeys = {
  all: ['admin'] as const,
  pendingSuppliers: () => [...adminKeys.all, 'pending-suppliers'] as const,
  metrics: (period?: MetricsPeriod) => [...adminKeys.all, 'metrics', period ?? 30] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  plans: () => [...adminKeys.all, 'plans'] as const,
  financialReports: () => [...adminKeys.all, 'financial-reports'] as const,
  subscriptions: (filters?: SubscriptionFilters) =>
    [...adminKeys.all, 'subscriptions', filters ?? {}] as const,
  auditLogs: (filters?: AuditLogFilters) => [...adminKeys.all, 'audit', filters ?? {}] as const,
  users: () => [...adminKeys.all, 'users'] as const,
}

export function usePendingSuppliers() {
  return useQuery({
    queryKey: adminKeys.pendingSuppliers(),
    queryFn: admin.fetchPendingSuppliers,
  })
}

export function useAdminMetrics(period: MetricsPeriod = 30) {
  return useQuery({
    queryKey: adminKeys.metrics(period),
    queryFn: () => admin.fetchMetricsDashboard(period),
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
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'metrics'] })
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
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'metrics'] })
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

export function useAdminPlans() {
  return useQuery({
    queryKey: adminKeys.plans(),
    queryFn: admin.fetchPlansAdmin,
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PlanInput> }) =>
      admin.updatePlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.plans() })
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'metrics'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.financialReports() })
    },
  })
}

export function useFinancialReports() {
  return useQuery({
    queryKey: adminKeys.financialReports(),
    queryFn: admin.fetchFinancialReports,
  })
}

export function useAdminSubscriptions(filters?: SubscriptionFilters) {
  return useQuery({
    queryKey: adminKeys.subscriptions(filters),
    queryFn: () => admin.fetchAdminSubscriptions(filters),
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: admin.fetchAdminUsers,
  })
}

export function useUpdateAdminUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      admin.setAdminUserActive(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() })
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'metrics'] })
    },
  })
}

export function useUpdateAdminSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
      metadata,
    }: {
      id: string
      input: UpdateSubscriptionInput
      metadata?: Record<string, unknown>
    }) => admin.updateAdminSubscription(id, input, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'subscriptions'] })
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'metrics'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.financialReports() })
      queryClient.invalidateQueries({ queryKey: adminKeys.auditLogs() })
    },
  })
}
