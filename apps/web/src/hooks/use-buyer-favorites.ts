import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as buyerProfile from '@/services/buyer-profile'

export const buyerFavoriteKeys = {
  all: ['buyer-favorites'] as const,
  categories: (userId: string) => [...buyerFavoriteKeys.all, 'categories', userId] as const,
}

export function useBuyerFavoriteCategories(userId: string | undefined) {
  return useQuery({
    queryKey: buyerFavoriteKeys.categories(userId ?? ''),
    queryFn: () => buyerProfile.fetchFavoriteCategoryIds(userId!),
    enabled: !!userId,
  })
}

export function useToggleFavoriteCategory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (categoryId: string) => buyerProfile.toggleFavoriteCategory(user!.id, categoryId),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: buyerFavoriteKeys.categories(user.id) })
      }
    },
  })
}
