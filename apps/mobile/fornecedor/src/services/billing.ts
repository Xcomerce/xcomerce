import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Plan = Tables<'plans'>
export type Subscription = Tables<'subscriptions'> & { plan?: Plan | null }
export type UsageCounter = Tables<'usage_counters'>

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as Plan[]
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Subscription | null
}

export async function fetchUsage(userId: string): Promise<UsageCounter[]> {
  const now = new Date()
  const { data, error } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('period_year', now.getFullYear())
    .eq('period_month', now.getMonth() + 1)

  if (error) throw error
  return (data ?? []) as UsageCounter[]
}
