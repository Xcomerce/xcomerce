import { supabase } from '@/lib/supabase'
import type { ProductInput } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type Product = Tables<'products'>

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
      sku: input.sku ?? null,
      descricao: input.descricao ?? null,
      marca: input.marca ?? null,
      preco_referencia: input.preco_referencia ?? null,
      cidade: input.cidade,
      uf: input.uf.toUpperCase(),
      is_active: input.is_active ?? true,
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
  if (input.sku !== undefined) payload.sku = input.sku
  if (input.descricao !== undefined) payload.descricao = input.descricao
  if (input.marca !== undefined) payload.marca = input.marca
  if (input.preco_referencia !== undefined) payload.preco_referencia = input.preco_referencia
  if (input.cidade !== undefined) payload.cidade = input.cidade
  if (input.uf !== undefined) payload.uf = input.uf.toUpperCase()
  if (input.is_active !== undefined) payload.is_active = input.is_active

  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function updateProductImage(id: string, imageUrl: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

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

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.uf) {
    query = query.eq('uf', filters.uf.toUpperCase())
  }
  if (filters?.search) {
    query = query.ilike('nome', `%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as any
}
