import { supabase } from '@/lib/supabase'
import { uploadFileFromUri, productImagePath } from '@/lib/storage'
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
  if (input.sku !== undefined) payload.sku = input.sku
  if (input.descricao !== undefined) payload.descricao = input.descricao
  if (input.marca !== undefined) payload.marca = input.marca
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

export async function uploadProductImage(
  supplierId: string,
  productId: string,
  uri: string,
  ext: string,
): Promise<Product> {
  const urls = await uploadProductImageFiles(supplierId, productId, [{ uri, ext }])
  return updateProductImages(productId, urls)
}

export async function uploadProductImageFiles(
  supplierId: string,
  productId: string,
  items: { uri: string; ext: string }[],
): Promise<string[]> {
  const uploaded: string[] = []
  for (let index = 0; index < items.length; index += 1) {
    const { uri, ext } = items[index]
    const normalizedExt = ext === 'jpeg' ? 'jpg' : ext
    const path = productImagePath(supplierId, productId, normalizedExt, `${Date.now()}-${index}`)
    const contentType =
      normalizedExt === 'png' ? 'image/png' : normalizedExt === 'webp' ? 'image/webp' : 'image/jpeg'
    await uploadFileFromUri('product-images', path, uri, contentType)
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    uploaded.push(data.publicUrl)
  }
  return uploaded
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
