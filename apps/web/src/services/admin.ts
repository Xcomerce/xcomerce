import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type SupplierProfile = Tables<'supplier_profiles'>
export type Category = Tables<'categories'>
export type AuditLog = Tables<'audit_logs'>

export type PendingSupplier = SupplierProfile & {
  profiles: { full_name: string; email: string | null; phone: string | null } | null
  companies: { cnpj: string; razao_social: string; nome_fantasia: string | null; cidade: string; uf: string } | null
}

export type AdminMetrics = {
  totalUsers: number
  totalBuyers: number
  totalSuppliers: number
  pendingApprovals: number
  publishedDemands: number
  offersSent: number
  activeSubscriptions: number
  mrr: number
}

export type CategoryInput = {
  name: string
  slug?: string
  description?: string | null
  parent_id?: string | null
  sort_order?: number
  is_active?: boolean
}

export type AuditLogFilters = {
  entity_type?: string
  action?: string
  limit?: number
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function fetchPendingSuppliers(): Promise<PendingSupplier[]> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .select(
      `
      *,
      profiles (full_name, email, phone),
      companies (cnpj, razao_social, nome_fantasia, cidade, uf)
    `,
    )
    .in('status', ['em_revisao', 'pendente'])
    .order('updated_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PendingSupplier[]
}

export async function approveSupplier(userId: string): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .update({
      status: 'aprovado',
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('user_id', userId)
    .eq('status', 'em_revisao')
    .select()
    .single()

  if (error) throw error

  await supabase.from('audit_logs').insert({
    action: 'supplier.approved',
    entity_type: 'supplier_profiles',
    entity_id: userId,
    metadata: {},
  })

  return data as SupplierProfile
}

export async function rejectSupplier(userId: string, reason: string): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from('supplier_profiles')
    .update({
      status: 'recusado',
      rejection_reason: reason,
    })
    .eq('user_id', userId)
    .eq('status', 'em_revisao')
    .select()
    .single()

  if (error) throw error

  await supabase.from('audit_logs').insert({
    action: 'supplier.rejected',
    entity_type: 'supplier_profiles',
    entity_id: userId,
    metadata: { reason },
  })

  return data as SupplierProfile
}

export async function fetchMetrics(): Promise<AdminMetrics> {
  const [
    profilesRes,
    buyersRes,
    suppliersRes,
    pendingRes,
    demandsRes,
    offersRes,
    subscriptionsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('buyer_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('supplier_profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('supplier_profiles')
      .select('*', { count: 'exact', head: true })
      .in('status', ['em_revisao', 'pendente']),
    supabase
      .from('demands')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'RASCUNHO'),
    supabase.from('offers').select('*', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('plan:plans(price)')
      .eq('status', 'active'),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (buyersRes.error) throw buyersRes.error
  if (suppliersRes.error) throw suppliersRes.error
  if (pendingRes.error) throw pendingRes.error
  if (demandsRes.error) throw demandsRes.error
  if (offersRes.error) throw offersRes.error
  if (subscriptionsRes.error) throw subscriptionsRes.error

  const mrr = (subscriptionsRes.data ?? []).reduce((sum, row) => {
    const plan = row.plan as { price?: number } | null
    return sum + (plan?.price ?? 0)
  }, 0)

  return {
    totalUsers: profilesRes.count ?? 0,
    totalBuyers: buyersRes.count ?? 0,
    totalSuppliers: suppliersRes.count ?? 0,
    pendingApprovals: pendingRes.count ?? 0,
    publishedDemands: demandsRes.count ?? 0,
    offersSent: offersRes.count ?? 0,
    activeSubscriptions: subscriptionsRes.data?.length ?? 0,
    mrr,
  }
}

export async function fetchCategoriesAdmin(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Category[]
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const slug = input.slug ?? slugify(input.name)
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      slug,
      description: input.description ?? null,
      parent_id: input.parent_id ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data as Category
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.slug !== undefined) payload.slug = input.slug
  if (input.description !== undefined) payload.description = input.description
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order
  if (input.is_active !== undefined) payload.is_active = input.is_active

  const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters?.action) query = query.eq('action', filters.action)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AuditLog[]
}
