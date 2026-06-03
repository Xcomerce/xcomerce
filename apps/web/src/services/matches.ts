import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type DemandMatch = Tables<'demand_matches'>
export type MatchStatus = DemandMatch['status']

export type DemandMatchWithDemand = DemandMatch & {
  demand: {
    id: string
    titulo: string
    descricao: string
    cidade: string
    uf: string
    quantidade: number
    unidade: string
    status: string
    category_id: string
    published_at: string | null
    expires_at: string | null
  } | null
}

export type MatchFilters = {
  status?: MatchStatus | MatchStatus[]
}

export async function fetchMatches(
  supplierId: string,
  filters?: MatchFilters,
): Promise<DemandMatchWithDemand[]> {
  let query = supabase
    .from('demand_matches')
    .select(
      `
      *,
      demand:demands(
        id,
        titulo,
        descricao,
        cidade,
        uf,
        quantidade,
        unidade,
        status,
        category_id,
        published_at,
        expires_at
      )
    `,
    )
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as DemandMatchWithDemand[]
}

export async function markViewed(matchId: string): Promise<DemandMatch> {
  const { data, error } = await supabase
    .from('demand_matches')
    .update({
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single()

  if (error) throw error
  return data as DemandMatch
}
