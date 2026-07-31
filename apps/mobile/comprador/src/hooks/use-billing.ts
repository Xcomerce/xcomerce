import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as billing from '@/services/billing'

export const billingKeys = {
  all: ['billing'] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  subscription: (userId: string) => [...billingKeys.all, 'subscription', userId] as const,
  usage: (userId: string) => [...billingKeys.all, 'usage', userId] as const,
}

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: billing.fetchPlans,
  })
}

export function useSubscription() {
  const { user } = useAuth()
  return useQuery({
    queryKey: billingKeys.subscription(user?.id ?? ''),
    queryFn: () => billing.fetchSubscription(user!.id),
    enabled: !!user?.id,
  })
}

export function useUsage() {
  const { user } = useAuth()
  return useQuery({
    queryKey: billingKeys.usage(user?.id ?? ''),
    queryFn: () => billing.fetchUsage(user!.id),
    enabled: !!user?.id,
  })
}
