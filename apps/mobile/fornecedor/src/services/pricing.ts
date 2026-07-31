import { supabase } from '@/lib/supabase'

export async function fetchCategoryMarketPrice(categoryId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_category_market_price', {
    p_category_id: categoryId,
  })

  if (error) throw error
  if (data == null) return null
  const value = Number(data)
  return Number.isFinite(value) && value > 0 ? value : null
}

export async function fetchDemandMarketPrice(demandId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_demand_market_price', {
    p_demand_id: demandId,
  })

  if (error) throw error
  if (data == null) return null
  const value = Number(data)
  return Number.isFinite(value) && value > 0 ? value : null
}
