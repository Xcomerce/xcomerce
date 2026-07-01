import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Product = Tables<'products'>

export type FeedProduct = Product & {
  supplier: {
    status: string
    avg_rating: number | null
    company: {
      nome_fantasia: string | null
      razao_social: string
    } | null
  } | null
  category?: {
    name: string
  } | null
}

export async function fetchFeedProducts(filters?: {
  categoryId?: string
  search?: string
  uf?: string
}): Promise<FeedProduct[]> {
  let query = supabase
    .from('products')
    .select(`
      *,
      supplier:supplier_profiles!inner(
        status,
        avg_rating,
        company:companies(nome_fantasia, razao_social)
      ),
      category:categories(name)
    `)
    .eq('is_active', true)
    .eq('supplier_profiles.status', 'aprovado')

  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters?.uf) query = query.eq('uf', filters.uf.toUpperCase())
  if (filters?.search) query = query.ilike('nome', `%${filters.search}%`)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FeedProduct[]
}
