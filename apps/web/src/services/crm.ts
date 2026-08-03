import { supabase } from '@/lib/supabase'

export type CrmLeadStatus = 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'descartado'

export type CrmLead = {
  id: string
  name: string
  email: string
  phone: string | null
  source: string
  profile_type: string | null
  lgpd_consent: boolean
  lgpd_consent_at: string | null
  notes: string | null
  created_at: string
  status: CrmLeadStatus
  assigned_to: string | null
  invite_token: string | null
  invite_sent_at: string | null
  converted_user_id: string | null
  nurture_sent_at: string | null
  email_opt_out: boolean
  unsubscribe_token: string
  updated_at: string
}

export type LeadInput = {
  name: string
  email: string
  phone?: string
  profile_type?: 'buyer' | 'supplier'
  lgpd_consent: boolean
  source?: string
  notes?: string
}

export type LeadFilters = {
  search?: string
  status?: CrmLeadStatus | ''
  profile_type?: 'buyer' | 'supplier' | ''
  source?: string
  page?: number
  pageSize?: number
}

export type LeadMetrics = {
  novo: number
  contatado: number
  qualificado: number
  convertido: number
  descartado: number
  total: number
  last7d: number
  conversionRate: number
}

export type EmailTemplateRow = {
  id: string
  key: string
  name: string
  category: 'crm' | 'transactional'
  subject: string
  html_body: string
  text_body: string | null
  variables: string[]
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

export type EmailProviderRow = {
  id: string
  slug: string
  name: string
  kind: 'smtp' | 'http_api'
  is_enabled: boolean
  is_default: boolean
  config: Record<string, unknown>
  secrets_ref: string | null
  status: 'active' | 'planned' | 'disabled'
  created_at: string
  updated_at: string
}

export const CRM_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  qualificado: 'Qualificado',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

export const CRM_STATUSES: CrmLeadStatus[] = [
  'novo',
  'contatado',
  'qualificado',
  'convertido',
  'descartado',
]

async function invokeCrmEmail(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('crm-email', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error.message ?? data.error.code ?? 'Erro crm-email')
  return data
}

export async function submitLead(input: LeadInput): Promise<CrmLead> {
  const { data, error } = await supabase
    .from('crm_leads')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      profile_type: input.profile_type ?? null,
      lgpd_consent: input.lgpd_consent,
      lgpd_consent_at: input.lgpd_consent ? new Date().toISOString() : null,
      source: input.source ?? 'landing',
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  const lead = data as CrmLead

  // best-effort welcome email
  try {
    await invokeCrmEmail({ action: 'welcome', lead_id: lead.id })
  } catch {
    /* não reverte o lead */
  }

  return lead
}

export async function fetchLeads(filters: LeadFilters = {}): Promise<{ data: CrmLead[]; total: number }> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('crm_leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.profile_type) query = query.eq('profile_type', filters.profile_type)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.search?.trim()) {
    const s = filters.search.trim()
    query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data ?? []) as CrmLead[], total: count ?? 0 }
}

export async function fetchLead(id: string): Promise<CrmLead> {
  const { data, error } = await supabase.from('crm_leads').select('*').eq('id', id).single()
  if (error) throw error
  return data as CrmLead
}

export async function fetchLeadMetrics(): Promise<LeadMetrics> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('crm_leads').select('status, created_at')
  if (error) throw error

  const rows = data ?? []
  const counts: LeadMetrics = {
    novo: 0,
    contatado: 0,
    qualificado: 0,
    convertido: 0,
    descartado: 0,
    total: rows.length,
    last7d: 0,
    conversionRate: 0,
  }

  for (const row of rows) {
    const status = row.status as CrmLeadStatus
    if (status in counts) counts[status] += 1
    if (row.created_at >= since7d) counts.last7d += 1
  }

  const eligible = counts.total - counts.descartado
  counts.conversionRate = eligible > 0 ? (counts.convertido / eligible) * 100 : 0
  return counts
}

export async function updateLead(
  id: string,
  patch: Partial<Pick<CrmLead, 'status' | 'assigned_to' | 'notes' | 'email_opt_out'>>,
): Promise<CrmLead> {
  const { data, error } = await supabase.from('crm_leads').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as CrmLead
}

export async function sendLeadInvite(leadId: string) {
  return invokeCrmEmail({ action: 'invite', lead_id: leadId })
}

export async function sendTemplateTest(templateKey: string, to: string) {
  return invokeCrmEmail({ action: 'test_template', template_key: templateKey, to })
}

export async function unsubscribeByToken(token: string) {
  return invokeCrmEmail({ action: 'unsubscribe', unsubscribe_token: token })
}

export async function getInviteLead(token: string): Promise<CrmLead | null> {
  const { data, error } = await supabase.rpc('get_lead_by_invite_token', { p_token: token })
  if (error) throw error
  const lead = (Array.isArray(data) ? data[0] : data) as CrmLead | undefined
  if (!lead) return null
  if (lead.invite_sent_at) {
    const sentAt = new Date(lead.invite_sent_at).getTime()
    if (Date.now() - sentAt > 14 * 24 * 60 * 60 * 1000) {
      throw new Error('Convite expirado')
    }
  }
  return lead
}

export async function consumeLeadInvite(token: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('consume_lead_invite', {
    p_token: token,
    p_user_id: userId,
  })
  if (error) throw error
}

export async function fetchEmailTemplates(): Promise<EmailTemplateRow[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('category')
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    variables: Array.isArray(row.variables) ? row.variables : [],
  })) as EmailTemplateRow[]
}

export async function updateEmailTemplate(
  id: string,
  patch: Partial<Pick<EmailTemplateRow, 'subject' | 'html_body' | 'text_body' | 'is_active'>>,
): Promise<EmailTemplateRow> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('email_templates')
    .update({ ...patch, updated_by: userData.user?.id ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return {
    ...data,
    variables: Array.isArray(data.variables) ? data.variables : [],
  } as EmailTemplateRow
}

export async function fetchEmailProviders(): Promise<EmailProviderRow[]> {
  const { data, error } = await supabase.from('email_providers').select('*').order('name')
  if (error) throw error
  return (data ?? []) as EmailProviderRow[]
}

export async function setDefaultEmailProvider(id: string): Promise<void> {
  const { data: target, error: getErr } = await supabase
    .from('email_providers')
    .select('id, status')
    .eq('id', id)
    .single()
  if (getErr) throw getErr
  if (target.status !== 'active') {
    throw new Error('Só é possível definir como padrão um provider ativo')
  }

  const { error: clearErr } = await supabase
    .from('email_providers')
    .update({ is_default: false })
    .eq('is_default', true)
  if (clearErr) throw clearErr

  const { error } = await supabase
    .from('email_providers')
    .update({ is_default: true, is_enabled: true })
    .eq('id', id)
  if (error) throw error
}

export async function setEmailProviderEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('email_providers')
    .update({ is_enabled: enabled })
    .eq('id', id)
  if (error) throw error
}
