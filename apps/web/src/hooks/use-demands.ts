import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as demands from '@/services/demands'
import type { DemandFilters } from '@/services/demands'
import type { DemandInput } from '@keve/shared'

export const demandKeys = {
  all: ['demands'] as const,
  list: (buyerId: string, filters?: DemandFilters) =>
    [...demandKeys.all, 'list', buyerId, filters ?? {}] as const,
  detail: (id: string) => [...demandKeys.all, 'detail', id] as const,
}

export function useDemands(filters?: DemandFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: demandKeys.list(user?.id ?? '', filters),
    queryFn: () => demands.fetchDemands(user!.id, filters),
    enabled: !!user?.id,
  })
}

export function useDemand(id: string | undefined) {
  return useQuery({
    queryKey: demandKeys.detail(id ?? ''),
    queryFn: () => demands.fetchDemand(id!),
    enabled: !!id,
  })
}

export function useCreateDemand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: DemandInput) => demands.createDemand(user!.id, input),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}

export function useUpdateDemand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DemandInput> }) =>
      demands.updateDemand(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: demandKeys.detail(data.id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}

export function useDeleteDemand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => demands.deleteDemand(id),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}

export function usePublishDemand() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => demands.publishDemand(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: demandKeys.detail(data.id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}
