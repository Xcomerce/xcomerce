import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { AutoOfferSettingsInput } from '@keve/shared'
import * as autoOffers from '@/services/auto-offers'

export const autoOfferKeys = {
  all: ['auto-offers'] as const,
  settings: (supplierId: string) => [...autoOfferKeys.all, 'settings', supplierId] as const,
  logs: (supplierId: string) => [...autoOfferKeys.all, 'logs', supplierId] as const,
  categories: (supplierId: string) => [...autoOfferKeys.all, 'categories', supplierId] as const,
}

export function useAutoOfferSettings() {
  const { user } = useAuth()
  return useQuery({
    queryKey: autoOfferKeys.settings(user?.id ?? ''),
    queryFn: () => autoOffers.fetchAutoOfferSettings(user!.id),
    enabled: !!user?.id,
  })
}

export function useAutoOfferLogs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: autoOfferKeys.logs(user?.id ?? ''),
    queryFn: () => autoOffers.fetchAutoOfferLogs(user!.id),
    enabled: !!user?.id,
  })
}

export function useSupplierAutoOfferCategories() {
  const { user } = useAuth()
  return useQuery({
    queryKey: autoOfferKeys.categories(user?.id ?? ''),
    queryFn: () => autoOffers.fetchSupplierCategoryIds(user!.id),
    enabled: !!user?.id,
  })
}

export function useUpsertAutoOfferSettings() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: AutoOfferSettingsInput) =>
      autoOffers.upsertAutoOfferSettings(user!.id, input),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: autoOfferKeys.settings(user.id) })
      }
    },
  })
}
