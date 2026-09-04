import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as admin from '@/services/admin'
import * as adminUserProfile from '@/services/admin-user-profile'
import * as diagnostics from '@/services/diagnostics'
import type { AuditLogFilters, CategoryInput, MetricsPeriod, PlanInput, SubscriptionFilters, UpdateSubscriptionInput } from '@/services/admin'
import type { AdminUserProfileChanges } from '@/services/admin-user-profile'
import { categoryKeys } from '@/hooks/use-categories'

export const adminKeys = {
  all: ['admin'] as const,
  pendingSuppliers: () => [...adminKeys.all, 'pending-suppliers'] as const,
  supplierApprovalDetails: (userId: string) => [...adminKeys.all, 'supplier-approval-details', userId] as const,
  metrics: (period?: MetricsPeriod) => [...adminKeys.all, 'metrics', period ?? 30] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  plans: () => [...adminKeys.all, 'plans'] as const,
  financialReports: () => [...adminKeys.all, 'financial-reports'] as const,
  subscriptions: (filters?: SubscriptionFilters) =>
    [...adminKeys.all, 'subscriptions', filters ?? {}] as const,
  auditLogs: (filters?: AuditLogFilters) => [...adminKeys.all, 'audit', filters ?? {}] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userSearch: (query: string, page: number) => [...adminKeys.all, 'user-search', query, page] as const,
  userDetail: (userId: string) => [...adminKeys.all, 'user-detail', userId] as const,
  userActivity: (userId: string) => [...adminKeys.all, 'user-activity', userId] as const,
  userHistory: (userId: string) => [...adminKeys.all, 'user-history', userId] as const,
  diagnostics: (filters: diagnostics.DiagnosticGroupFilters) =>
    [...adminKeys.all, 'diagnostics', filters] as const,
  demandNearMiss: (demandId: string) => [...adminKeys.all, 'demand-near-miss', demandId] as const,
}

export function usePendingSuppliers() {
  return useQuery({
    queryKey: adminKeys.pendingSuppliers(),
    queryFn: admin.fetchPendingSuppliers,
  })
}

export function useSupplierApprovalDetails(userId: string | null) {
  return useQuery({
    queryKey: adminKeys.supplierApprovalDetails(userId ?? ''),
    queryFn: () => admin.fetchSupplierApprovalDetails(userId!),
    enabled: !!userId,
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

const USER_SEARCH_PAGE_SIZE = 20

export function useAdminUserSearch(query: string, page: number) {
  return useQuery({
    queryKey: adminKeys.userSearch(query, page),
    queryFn: () => adminUserProfile.searchAdminUsers(query, page, USER_SEARCH_PAGE_SIZE),
    placeholderData: (previous) => previous,
  })
}

export function useAdminUserDetail(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.userDetail(userId ?? ''),
    queryFn: () => adminUserProfile.fetchAdminUserDetail(userId!),
    enabled: !!userId && enabled,
  })
}

export function useAdminUserActivity(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.userActivity(userId ?? ''),
    queryFn: () => adminUserProfile.fetchUserActivity(userId!),
    enabled: !!userId && enabled,
  })
}

export function useAdminUserHistory(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.userHistory(userId ?? ''),
    queryFn: () => adminUserProfile.fetchProfileHistory(userId!),
    enabled: !!userId && enabled,
  })
}

export function useLogProfileAccess() {
  return useMutation({
    mutationFn: ({
      userId,
      accessType,
      justification,
    }: {
      userId: string
      accessType: 'search_result' | 'profile_view' | 'tab_activity' | 'tab_history'
      justification?: string
    }) => adminUserProfile.logProfileAccess(userId, accessType, justification),
  })
}

export function useUpdateAdminUserProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      changes,
      reason,
    }: {
      userId: string
      changes: AdminUserProfileChanges
      reason: string
    }) => adminUserProfile.updateAdminUserProfile(userId, changes, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: adminKeys.userHistory(variables.userId) })
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'user-search'] })
    },
  })
}

export function useRefreshCompanyCnpj() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      companyId,
      targetUserId,
      reason,
    }: {
      companyId: string
      targetUserId: string
      reason: string
    }) => adminUserProfile.refreshCompanyCnpj(companyId, targetUserId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userDetail(variables.targetUserId) })
      queryClient.invalidateQueries({ queryKey: adminKeys.userHistory(variables.targetUserId) })
    },
  })
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminUserProfile.requestAccountDeletion(userId, reason),
  })
}

export function useConfirmAccountDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      token,
      confirmationPhrase,
    }: {
      token: string
      confirmationPhrase: string
    }) => adminUserProfile.confirmAccountDeletion(token, confirmationPhrase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'user-search'] })
    },
  })
}

export function useDiagnosticGroups(filters: diagnostics.DiagnosticGroupFilters) {
  return useQuery({
    queryKey: adminKeys.diagnostics(filters),
    queryFn: () => diagnostics.fetchDiagnosticGroups(filters),
  })
}

export function useResolveDiagnosticGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: diagnostics.ResolveDiagnosticInput) =>
      diagnostics.resolveDiagnosticGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'diagnostics'] })
    },
  })
}

export function useDemandNearMiss(demandId: string | null) {
  return useQuery({
    queryKey: adminKeys.demandNearMiss(demandId ?? ''),
    queryFn: () => diagnostics.fetchDemandNearMiss(demandId!),
    enabled: Boolean(demandId),
  })
}

export function useAddVariantSuggestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      categoryId: string
      axisName: string
      value: string
      sourceGroupKey?: string
    }) => diagnostics.addVariantValueSuggestion(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'diagnostics'] })
    },
  })
}
