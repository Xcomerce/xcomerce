import { useQuery } from '@tanstack/react-query'
import { fetchSupportContactSettings } from '@/services/support-settings'

export const supportSettingsKeys = {
  all: ['support-settings'] as const,
  contact: () => [...supportSettingsKeys.all, 'contact'] as const,
}

export function useSupportContactSettings() {
  return useQuery({
    queryKey: supportSettingsKeys.contact(),
    queryFn: fetchSupportContactSettings,
    staleTime: 60_000,
  })
}
