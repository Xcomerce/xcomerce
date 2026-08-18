import { pickBestCatalogUnitPrice } from '@/lib/offer-variant-pricing'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

type DemandForPricing = Pick<
  Tables<'demands'>,
  'category_id' | 'cor' | 'tamanho' | 'especificacoes' | 'titulo'
>

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

export async function fetchSupplierCatalogUnitPriceForDemand(
  supplierId: string,
  demandId: string,
  demand: DemandForPricing,
): Promise<number | null> {
  const [{ data: products, error: productsError }, marketPrice] = await Promise.all([
    supabase
      .from('products')
      .select('preco_referencia, tem_cor, tem_tamanho, cores, tamanhos, nome')
      .eq('supplier_id', supplierId)
      .eq('category_id', demand.category_id)
      .eq('is_active', true),
    fetchDemandMarketPrice(demandId).catch(() => null),
  ])

  if (productsError) throw productsError

  const unitPrice = pickBestCatalogUnitPrice(products ?? [], demand, marketPrice)
  return unitPrice > 0 ? unitPrice : null
}
