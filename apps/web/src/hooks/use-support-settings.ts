import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupportContactSettingsParsed } from '@keve/shared'
import * as supportSettings from '@/services/support-settings'

export const supportSettingsKeys = {
  all: ['support-settings'] as const,
  contact: () => [...supportSettingsKeys.all, 'contact'] as const,
}

export function useSupportContactSettings() {
  return useQuery({
    queryKey: supportSettingsKeys.contact(),
    queryFn: supportSettings.fetchSupportContactSettings,
    staleTime: 60_000,
  })
}

export function useUpdateSupportContactSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SupportContactSettingsParsed) =>
      supportSettings.updateSupportContactSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(supportSettingsKeys.contact(), data)
    },
  })
}
