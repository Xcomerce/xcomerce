import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { updateProfile, type UpdateProfileInput } from '@/services/profile'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(user!.id, input),
    onSuccess: async () => {
      await refreshProfile()
      if (user?.id) {
        queryClient.invalidateQueries()
      }
    },
  })
}
