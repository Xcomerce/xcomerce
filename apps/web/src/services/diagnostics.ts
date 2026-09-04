import { supabase } from '@/lib/supabase'
import type { CategoryInput } from '@/services/admin'

export type DiagnosticSection = 'friction' | 'technical'
export type DiagnosticPeriod = 'today' | '7d' | '30d'
export type DiagnosticUserRoleFilter = 'buyer' | 'supplier' | null

export type DiagnosticGroup = {
  group_key: string
  event_type: string
  affected_users: number
  total_occurrences: number
  first_seen: string
  last_seen: string
  sample_payload: Record<string, unknown> | null
  resolution_type: string | null
  resolved_at: string | null
  resolved_by: string | null
}

export type DemandNearMiss = {
  supplier_id: string
  supplier_name: string
  service_city: string | null
  service_uf: string | null
  outcome: string
  skip_reason: string | null
  score: number | null
}

export type DiagnosticGroupFilters = {
  section: DiagnosticSection
  period?: DiagnosticPeriod
  userRole?: DiagnosticUserRoleFilter
  hideResolved?: boolean
  limit?: number
}

export type ResolveDiagnosticInput = {
  groupKey: string
  eventType: string
  resolutionType: 'marked_resolved' | 'category_created' | 'variant_added' | 'technical_fixed'
  notes?: string
  metadata?: Record<string, unknown>
}

export async function fetchDiagnosticGroups(
  filters: DiagnosticGroupFilters,
): Promise<DiagnosticGroup[]> {
  const { data, error } = await supabase.rpc('fetch_diagnostic_groups', {
    p_section: filters.section,
    p_period: filters.period ?? '7d',
    p_user_role: filters.userRole ?? null,
    p_hide_resolved: filters.hideResolved ?? true,
    p_limit: filters.limit ?? 50,
  })

  if (error) throw error
  return (data ?? []) as DiagnosticGroup[]
}

export async function resolveDiagnosticGroup(input: ResolveDiagnosticInput): Promise<void> {
  const { error } = await supabase.rpc('resolve_diagnostic_group', {
    p_group_key: input.groupKey,
    p_event_type: input.eventType,
    p_resolution_type: input.resolutionType,
    p_notes: input.notes ?? null,
    p_metadata: input.metadata ?? {},
  })
  if (error) throw error
}

export async function fetchDemandNearMiss(demandId: string): Promise<DemandNearMiss[]> {
  const { data, error } = await supabase.rpc('fetch_demand_near_miss', {
    p_demand_id: demandId,
  })
  if (error) throw error
  return (data ?? []) as DemandNearMiss[]
}

export async function addVariantValueSuggestion(input: {
  categoryId: string
  axisName: string
  value: string
  sourceGroupKey?: string
}): Promise<void> {
  const { error } = await supabase.rpc('add_variant_value_suggestion', {
    p_category_id: input.categoryId,
    p_axis_name: input.axisName,
    p_value: input.value,
    p_source_group_key: input.sourceGroupKey ?? null,
  })
  if (error) throw error
}

export function getDiagnosticEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    search_no_result: 'Busca sem resultado',
    category_not_found: 'Categoria não encontrada',
    variant_value_new: 'Cor ou tamanho novo',
    demand_no_match: 'Solicitação sem fornecedor compatível',
    demand_expired_no_offer: 'Solicitação expirada sem proposta',
    product_form_abandoned: 'Cadastro de produto abandonado',
    server_error_500: 'Erro de servidor (500)',
    upload_failure: 'Falha de upload',
    request_timeout: 'Requisição expirou',
    client_js_error: 'Erro JavaScript',
  }
  return labels[eventType] ?? eventType
}

export function getDiagnosticItemTitle(group: DiagnosticGroup): string {
  const payload = group.sample_payload ?? {}
  switch (group.event_type) {
    case 'search_no_result':
    case 'category_not_found':
      return String(payload.query ?? group.group_key.split(':').slice(1).join(':'))
    case 'variant_value_new':
      return `${payload.axis_name ?? 'Variação'}: ${payload.value ?? ''}`
    case 'demand_no_match':
    case 'demand_expired_no_offer':
      return String(payload.titulo ?? payload.demand_id ?? group.group_key)
    case 'product_form_abandoned':
      return `Etapa ${payload.step ?? group.group_key.split('_').pop()}`
    case 'server_error_500':
    case 'request_timeout':
    case 'client_js_error':
      return String(payload.message ?? payload.route ?? group.group_key)
    case 'upload_failure':
      return `${payload.bucket ?? 'upload'}: ${payload.code ?? payload.message ?? 'erro'}`
    default:
      return group.group_key
  }
}

export function getCategoryPrefillFromGroup(group: DiagnosticGroup): Partial<CategoryInput> {
  const payload = group.sample_payload ?? {}
  const name = String(payload.query ?? getDiagnosticItemTitle(group)).trim()
  return {
    name,
    slug: name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    is_active: true,
  }
}

export const SKIP_REASON_LABELS: Record<string, string> = {
  variant_mismatch: 'Variação incompatível',
  out_of_region: 'Fora da região',
  not_approved: 'Fornecedor não aprovado',
  no_category: 'Sem produto/categoria',
  already_matched: 'Já notificado',
}
