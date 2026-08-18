import { supabase } from '@/lib/supabase'
import type { ProductMatchSource, SearchSuggestion, Tables } from '@keve/shared'
import { mapSearchSuggestionRow } from '@keve/shared'

export type Product = Tables<'products'>

export type FeedProduct = Product & {
  supplier: {
    status: string
    avg_rating: number | null
    store_name: string | null
    company: {
      nome_fantasia: string | null
      razao_social: string
    } | null
  } | null
  category?: {
    name: string
  } | null
}

export type FeedProductSearchResult = FeedProduct & {
  rank?: number
  matchSource?: ProductMatchSource | null
  isOutsideUf?: boolean
}

type SearchFeedProductRow = Product & {
  rank: number | null
  match_source: ProductMatchSource | null
  is_outside_uf: boolean
  supplier: FeedProduct['supplier']
  category: { name: string } | null
}

function mapSearchFeedProductRow(row: SearchFeedProductRow): FeedProductSearchResult {
  const {
    rank,
    match_source,
    is_outside_uf,
    supplier,
    category,
    ...product
  } = row

  return {
    ...(product as Product),
    supplier,
    category,
    rank: rank ?? undefined,
    matchSource: match_source ?? undefined,
    isOutsideUf: is_outside_uf,
  }
}

export async function fetchFeedProducts(filters?: {
  categoryId?: string
  categoryIds?: string[]
  search?: string
  uf?: string
}): Promise<FeedProductSearchResult[]> {
  const categoryIds =
    filters?.categoryIds && filters.categoryIds.length > 0
      ? filters.categoryIds
      : filters?.categoryId
        ? [filters.categoryId]
        : null

  const { data, error } = await supabase.rpc('search_feed_products', {
    p_query: filters?.search?.trim() || null,
    p_category_ids: categoryIds,
    p_uf: filters?.uf?.toUpperCase() || null,
    p_limit: 50,
    p_offset: 0,
  })

  if (error) throw error
  return ((data ?? []) as SearchFeedProductRow[]).map(mapSearchFeedProductRow)
}

export async function fetchSearchSuggestions(query: string, limit = 8): Promise<SearchSuggestion[]> {
  const trimmed = query.trim()
  const { data, error } = await supabase.rpc('search_product_suggestions', {
    p_query: trimmed || ' ',
    p_limit: limit,
  })

  if (error) throw error
  return ((data ?? []) as Array<{ suggestion: string; suggestion_type: string; score: number }>).map(
    mapSearchSuggestionRow,
  )
}
