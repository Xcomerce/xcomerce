import { supabase } from '@/lib/supabase'
import type { DemandInput } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type Demand = Tables<'demands'>
export type DemandStatus = Demand['status']

export type DemandFilters = {
  status?: DemandStatus | DemandStatus[]
}

export async function fetchDemands(buyerId: string, filters?: DemandFilters): Promise<Demand[]> {
  let query = supabase
    .from('demands')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Demand[]
}

export async function fetchDemand(id: string): Promise<Demand | null> {
  const { data, error } = await supabase.from('demands').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Demand | null
}

export async function createDemand(buyerId: string, input: DemandInput): Promise<Demand> {
  const { data, error } = await supabase
    .from('demands')
    .insert({
      buyer_id: buyerId,
      category_id: input.category_id,
      titulo: input.titulo,
      descricao: input.descricao,
      quantidade: input.quantidade,
      unidade: input.unidade,
      cidade: input.cidade,
      uf: input.uf.toUpperCase(),
      raio_km: input.raio_km,
      prazo_desejado: input.prazo_desejado || null,
      observacoes: input.observacoes || null,
      status: 'RASCUNHO',
    })
    .select()
    .single()

  if (error) throw error
  return data as Demand
}

export async function updateDemand(id: string, input: Partial<DemandInput>): Promise<Demand> {
  const payload: Record<string, unknown> = {}
  if (input.titulo !== undefined) payload.titulo = input.titulo
  if (input.descricao !== undefined) payload.descricao = input.descricao
  if (input.category_id !== undefined) payload.category_id = input.category_id
  if (input.quantidade !== undefined) payload.quantidade = input.quantidade
  if (input.unidade !== undefined) payload.unidade = input.unidade
  if (input.cidade !== undefined) payload.cidade = input.cidade
  if (input.uf !== undefined) payload.uf = input.uf.toUpperCase()
  if (input.raio_km !== undefined) payload.raio_km = input.raio_km
  if (input.prazo_desejado !== undefined) payload.prazo_desejado = input.prazo_desejado || null
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes || null

  const { data, error } = await supabase.from('demands').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Demand
}

export async function deleteDemand(id: string): Promise<void> {
  const { error } = await supabase.from('demands').delete().eq('id', id).eq('status', 'RASCUNHO')
  if (error) throw error
}

export async function publishDemand(id: string): Promise<Demand> {
  const { data, error } = await supabase
    .from('demands')
    .update({
      status: 'PUBLICADA',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['RASCUNHO'])
    .select()
    .single()

  if (error) throw error
  return data as Demand
}
