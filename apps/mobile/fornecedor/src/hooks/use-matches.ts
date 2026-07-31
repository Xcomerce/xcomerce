import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as matches from '@/services/matches'
import type { MatchFilters } from '@/services/matches'

export const matchKeys = {
  all: ['matches'] as const,
  list: (supplierId: string, filters?: MatchFilters) =>
    [...matchKeys.all, 'list', supplierId, filters ?? {}] as const,
}

export function useMatches(filters?: MatchFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: matchKeys.list(user?.id ?? '', filters),
    queryFn: () => matches.fetchMatches(user!.id, filters),
    enabled: !!user?.id,
  })
}

export function useMarkMatchViewed() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (matchId: string) => matches.markViewed(matchId),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: matchKeys.all })
      }
    },
  })
}
