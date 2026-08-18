import { supabase } from '@/lib/supabase'
import type { ProductInput, ProductMatchSource, SearchSuggestion } from '@keve/shared'
import { mapSearchSuggestionRow } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type Product = Tables<'products'>

function normalizeOptionalText(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function fetchProducts(supplierId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Product[]
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Product | null
}

export async function countProducts(supplierId: string): Promise<number> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)
    .eq('is_active', true)

  if (error) throw error
  return count ?? 0
}

export async function createProduct(supplierId: string, input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      supplier_id: supplierId,
      category_id: input.category_id,
      nome: input.nome,
      sku: normalizeOptionalText(input.sku),
      descricao: normalizeOptionalText(input.descricao),
      marca: normalizeOptionalText(input.marca),
      preco_referencia: input.preco_referencia ?? null,
      cidade: input.cidade,
      uf: input.uf.toUpperCase(),
      is_active: input.is_active ?? true,
      tem_cor: input.tem_cor ?? false,
      tem_tamanho: input.tem_tamanho ?? false,
      tipo_tamanho: input.tem_tamanho ? (input.tipo_tamanho ?? null) : null,
      cores: input.tem_cor ? (input.cores ?? []) : [],
      tamanhos: input.tem_tamanho ? (input.tamanhos ?? []) : [],
      estoque_variacoes:
        input.tem_cor || input.tem_tamanho ? (input.estoque_variacoes ?? []) : [],
    })
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const payload: Record<string, unknown> = {}
  if (input.nome !== undefined) payload.nome = input.nome
  if (input.category_id !== undefined) payload.category_id = input.category_id
  if (input.sku !== undefined) payload.sku = normalizeOptionalText(input.sku)
  if (input.descricao !== undefined) payload.descricao = normalizeOptionalText(input.descricao)
  if (input.marca !== undefined) payload.marca = normalizeOptionalText(input.marca)
  if (input.preco_referencia !== undefined) payload.preco_referencia = input.preco_referencia
  if (input.cidade !== undefined) payload.cidade = input.cidade
  if (input.uf !== undefined) payload.uf = input.uf.toUpperCase()
  if (input.is_active !== undefined) payload.is_active = input.is_active
  if (input.tem_cor !== undefined) {
    payload.tem_cor = input.tem_cor
    payload.cores = input.tem_cor ? (input.cores ?? []) : []
  } else if (input.cores !== undefined) {
    payload.cores = input.cores
  }
  if (input.tem_tamanho !== undefined) {
    payload.tem_tamanho = input.tem_tamanho
    payload.tipo_tamanho = input.tem_tamanho ? (input.tipo_tamanho ?? null) : null
    payload.tamanhos = input.tem_tamanho ? (input.tamanhos ?? []) : []
  } else {
    if (input.tipo_tamanho !== undefined) payload.tipo_tamanho = input.tipo_tamanho
    if (input.tamanhos !== undefined) payload.tamanhos = input.tamanhos
  }
  if (input.estoque_variacoes !== undefined) {
    payload.estoque_variacoes = input.estoque_variacoes
  } else if (input.tem_cor === false && input.tem_tamanho === false) {
    payload.estoque_variacoes = []
  }

  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function updateProductImage(id: string, imageUrl: string): Promise<Product> {
  return updateProductImages(id, [imageUrl])
}

export async function updateProductImages(id: string, imageUrls: string[]): Promise<Product> {
  const urls = imageUrls.map((url) => url.trim()).filter(Boolean)
  const { data, error } = await supabase
    .from('products')
    .update({
      image_urls: urls,
      image_url: urls[0] ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export type FeedProductSupplier = {
  status: string
  avg_rating: number | null
  store_name: string | null
  company: {
    nome_fantasia: string | null
    razao_social: string
  } | null
}

export type FeedProduct = Product & {
  supplier: FeedProductSupplier | null
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
  supplier: FeedProductSupplier | null
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

export type SupplierStoreProfile = {
  supplierId: string
  store_name: string | null
  status: string
  avg_rating: number
  total_ratings: number
  orders_completed: number
  company: {
    nome_fantasia: string | null
    razao_social: string
    cidade: string
    uf: string
  } | null
  profile: {
    full_name: string
    avatar_url: string | null
  } | null
}

export async function fetchSupplierStore(supplierId: string): Promise<SupplierStoreProfile | null> {
  const [supplierRes, profileRes] = await Promise.all([
    supabase
      .from('supplier_profiles')
      .select(
        `
        user_id,
        store_name,
        status,
        avg_rating,
        total_ratings,
        orders_completed,
        company:companies(nome_fantasia, razao_social, cidade, uf)
      `,
      )
      .eq('user_id', supplierId)
      .eq('status', 'aprovado')
      .maybeSingle(),
    supabase.from('profiles').select('full_name, avatar_url').eq('id', supplierId).maybeSingle(),
  ])

  if (supplierRes.error) throw supplierRes.error
  if (profileRes.error) throw profileRes.error
  if (!supplierRes.data) return null

  const row = supplierRes.data as {
    user_id: string
    store_name: string | null
    status: string
    avg_rating: number
    total_ratings: number
    orders_completed: number
    company: SupplierStoreProfile['company']
  }

  return {
    supplierId: row.user_id,
    store_name: row.store_name,
    status: row.status,
    avg_rating: row.avg_rating ?? 0,
    total_ratings: row.total_ratings ?? 0,
    orders_completed: row.orders_completed ?? 0,
    company: row.company,
    profile: profileRes.data
      ? {
          full_name: profileRes.data.full_name,
          avatar_url: profileRes.data.avatar_url,
        }
      : null,
  }
}

export async function fetchSupplierCatalog(supplierId: string): Promise<FeedProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      supplier:supplier_profiles!inner(
        status,
        store_name,
        avg_rating,
        company:companies(nome_fantasia, razao_social)
      ),
      category:categories(name)
    `,
    )
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .eq('supplier_profiles.status', 'aprovado')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as FeedProduct[]
}
