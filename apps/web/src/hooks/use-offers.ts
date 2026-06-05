import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as offers from '@/services/offers'
import type { OfferInput } from '@keve/shared'
import { orderKeys } from '@/hooks/use-orders'
import { demandKeys } from '@/hooks/use-demands'

export const offerKeys = {
  all: ['offers'] as const,
  byDemand: (demandId: string) => [...offerKeys.all, 'demand', demandId] as const,
}

export function useOffersForDemand(demandId: string | undefined) {
  return useQuery({
    queryKey: offerKeys.byDemand(demandId ?? ''),
    queryFn: () => offers.fetchOffersForDemand(demandId!),
    enabled: !!demandId,
  })
}

export function useCreateOffer() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: OfferInput) => offers.createOffer(user!.id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.byDemand(data.demand_id) })
    },
  })
}

export function useRevealContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (offerId: string) => offers.revealContact(offerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.byDemand(data.demand_id) })
    },
  })
}

export function useAcceptOffer() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (offerId: string) => offers.acceptOffer(offerId, user!.id),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.byDemand(order.demand_id) })
      queryClient.invalidateQueries({ queryKey: demandKeys.detail(order.demand_id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: orderKeys.list(user.id, 'buyer') })
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}

export function useRejectOffer() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (offerId: string) => offers.rejectOffer(offerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.byDemand(data.demand_id) })
      queryClient.invalidateQueries({ queryKey: demandKeys.detail(data.demand_id) })
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: demandKeys.list(user.id) })
      }
    },
  })
}

export function useOfferDetail(offerId: string | undefined) {
  return useQuery({
    queryKey: [...offerKeys.all, 'detail', offerId ?? ''],
    queryFn: () => offers.fetchOfferById(offerId!),
    enabled: !!offerId,
  })
}
