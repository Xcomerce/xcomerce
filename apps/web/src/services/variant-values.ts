import { supabase } from '@/lib/supabase'

export type VariantAxisValueSuggestion = {
  value: string
  normalized: string
  supplier_count: number
}

export async function fetchVariantAxisValues(
  categoryId: string,
  axisName: string,
  query: string,
  side: 'buyer' | 'supplier' = 'buyer',
  limit = 20,
): Promise<VariantAxisValueSuggestion[]> {
  if (!categoryId || !axisName.trim()) return []

  const { data, error } = await supabase.rpc('get_variant_axis_values', {
    p_category_id: categoryId,
    p_axis_name: axisName,
    p_query: query.trim(),
    p_side: side,
    p_limit: limit,
  })

  if (error) throw error
  return (data ?? []) as VariantAxisValueSuggestion[]
}
