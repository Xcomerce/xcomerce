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
    cor: string | null
    tamanho: string | null
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
        expires_at,
        cor,
        tamanho
      )
    `,
    )
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    query = query.in('status', statuses)
    if (statuses.length === 1 && statuses[0] === 'notified') {
      query = query.is('viewed_at', null)
    }
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

export async function markDismissed(matchId: string): Promise<DemandMatch> {
  const { data, error } = await supabase
    .from('demand_matches')
    .update({ status: 'dismissed' })
    .eq('id', matchId)
    .select()
    .single()

  if (error) throw error
  return data as DemandMatch
}

export async function markViewedByDemand(
  supplierId: string,
  demandId: string,
): Promise<void> {
  const { error } = await supabase
    .from('demand_matches')
    .update({
      status: 'viewed',
      viewed_at: new Date().toISOString(),
    })
    .eq('supplier_id', supplierId)
    .eq('demand_id', demandId)
    .eq('status', 'notified')

  if (error) throw error
}

export type MatchRunResult = {
  demand_id: string
  matches_created: number
  suppliers_notified: number
  skipped: {
    already_matched: number
    not_approved: number
    out_of_region: number
    variant_mismatch: number
  }
}

export async function requestDemandMatch(demandId: string): Promise<MatchRunResult | null> {
  const { data, error } = await supabase.functions.invoke('request-demand-match', {
    body: { demand_id: demandId },
  })
  if (error) throw error
  return (data as MatchRunResult | null) ?? null
}

export async function syncSupplierMatches(): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-supplier-matches')
  if (error) throw error
}
