import { supabase } from '@/lib/supabase'
import type { AutoOfferSettingsInput } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type AutoOfferSettings = Tables<'supplier_auto_offer_settings'>
export type AutoOfferLog = Tables<'supplier_auto_offer_logs'>

const DEFAULT_SETTINGS: Omit<AutoOfferSettingsInput, 'category_ids'> & {
  category_ids: string[] | null
} = {
  enabled: false,
  discount_percent: 0,
  min_demand_quantity: 1,
  max_demand_quantity: null,
  delivery_days: 7,
  validity_days: 7,
  default_message: '',
  category_ids: null,
}

export async function fetchAutoOfferSettings(
  supplierId: string,
): Promise<AutoOfferSettingsInput> {
  const { data, error } = await supabase
    .from('supplier_auto_offer_settings')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { ...DEFAULT_SETTINGS }

  return {
    enabled: data.enabled,
    discount_percent: Number(data.discount_percent),
    min_demand_quantity: data.min_demand_quantity,
    max_demand_quantity: data.max_demand_quantity,
    delivery_days: data.delivery_days,
    validity_days: data.validity_days,
    default_message: data.default_message ?? '',
    category_ids: data.category_ids,
  }
}

export async function upsertAutoOfferSettings(
  supplierId: string,
  input: AutoOfferSettingsInput,
): Promise<AutoOfferSettings> {
  const payload = {
    supplier_id: supplierId,
    enabled: input.enabled,
    discount_percent: input.discount_percent,
    min_demand_quantity: input.min_demand_quantity,
    max_demand_quantity: input.max_demand_quantity ?? null,
    delivery_days: input.delivery_days,
    validity_days: input.validity_days,
    default_message: input.default_message?.trim() ? input.default_message.trim() : null,
    category_ids:
      input.category_ids && input.category_ids.length > 0 ? input.category_ids : null,
  }

  const { data, error } = await supabase
    .from('supplier_auto_offer_settings')
    .upsert(payload, { onConflict: 'supplier_id' })
    .select()
    .single()

  if (error) throw error
  return data as AutoOfferSettings
}

export async function fetchAutoOfferLogs(
  supplierId: string,
  limit = 20,
): Promise<AutoOfferLog[]> {
  const { data, error } = await supabase
    .from('supplier_auto_offer_logs')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AutoOfferLog[]
}

export async function fetchSupplierCategoryIds(supplierId: string): Promise<string[]> {
  const [{ data: linked, error: linkedError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase.from('supplier_categories').select('category_id').eq('supplier_id', supplierId),
      supabase
        .from('products')
        .select('category_id')
        .eq('supplier_id', supplierId)
        .eq('is_active', true),
    ])

  if (linkedError) throw linkedError
  if (productsError) throw productsError

  const ids = new Set<string>()
  for (const row of linked ?? []) {
    if (row.category_id) ids.add(row.category_id)
  }
  for (const row of products ?? []) {
    if (row.category_id) ids.add(row.category_id)
  }
  return [...ids]
}
