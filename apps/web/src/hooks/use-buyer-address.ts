import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as buyerProfile from '@/services/buyer-profile'
import type { BuyerAddressInput } from '@keve/shared'

export const buyerAddressKeys = {
  all: ['buyer-address'] as const,
  detail: (userId: string) => [...buyerAddressKeys.all, userId] as const,
}

export function useBuyerAddress() {
  const { user } = useAuth()

  return useQuery({
    queryKey: buyerAddressKeys.detail(user?.id ?? ''),
    queryFn: () => buyerProfile.fetchBuyerAddress(user!.id),
    enabled: !!user?.id,
  })
}

export function useUpdateBuyerAddress() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: BuyerAddressInput) => buyerProfile.updateBuyerAddress(user!.id, input),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: buyerAddressKeys.detail(user.id) })
      }
    },
  })
}
