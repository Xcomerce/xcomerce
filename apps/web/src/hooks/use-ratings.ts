import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as ratings from '@/services/ratings'
import type { SubmitRatingInput } from '@/services/ratings'

export const ratingKeys = {
  all: ['ratings'] as const,
  profile: (userId: string) => [...ratingKeys.all, 'profile', userId] as const,
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ratingKeys.profile(userId ?? ''),
    queryFn: () => ratings.fetchPublicProfile(userId!),
    enabled: !!userId,
  })
}

export function useSubmitRating() {
  const { activeRole } = useAuth()

  return useMutation({
    mutationFn: (input: Omit<SubmitRatingInput, 'raterRole'>) => {
      if (!activeRole || (activeRole !== 'buyer' && activeRole !== 'supplier')) {
        throw new Error('Papel ativo inválido para avaliação.')
      }
      return ratings.submitRating({ ...input, raterRole: activeRole })
    },
  })
}
