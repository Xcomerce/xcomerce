import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Plan = Tables<'plans'>
export type Subscription = Tables<'subscriptions'> & { plan?: Plan | null }
export type UsageCounter = Tables<'usage_counters'>

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export type CreateCheckoutInput = {
  plan_id: string
  billing_type: BillingType
  success_url: string
  cancel_url: string
}

export type CreateCheckoutResult = {
  checkout_url: string
  asaas_customer_id: string
  expires_at: string
}

function parseFunctionError(data: unknown): void {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    data.error &&
    typeof data.error === 'object' &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    throw new Error(data.error.message)
  }
}

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
  const period_year = now.getFullYear()
  const period_month = now.getMonth() + 1

  const { data, error } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('period_year', period_year)
    .eq('period_month', period_month)

  if (error) throw error
  return (data ?? []) as UsageCounter[]
}

export async function invokeCreateCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: input })
  if (error) throw error
  parseFunctionError(data)
  return data as CreateCheckoutResult
}
