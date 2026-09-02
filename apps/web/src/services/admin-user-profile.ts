import { supabase } from '@/lib/supabase'
import type { SupplierStatus, Tables, UserRole } from '@keve/shared'

export type AdminUserSearchResult = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  roles: UserRole[]
  has_buyer_profile: boolean
  supplier_status: SupplierStatus | null
  is_active: boolean
  created_at: string
  cnpj: string | null
  razao_social: string | null
  total_count: number
}

export type ProfileChangeEntry = {
  entity: string
  field: string
  old_value: string | null
  new_value: string | null
}

export type AdminUserProfileChanges = {
  profiles?: Record<string, string | null>
  buyer_profiles?: Record<string, string | null>
  supplier_profiles?: Record<string, number | string | null>
}

export type AdminUserDetail = {
  profile: Tables<'profiles'>
  roles: UserRole[]
  buyerProfile: Tables<'buyer_profiles'> | null
  supplierProfile: (Tables<'supplier_profiles'> & { store_name?: string | null }) | null
  company: Tables<'companies'> | null
  subscription: {
    status: Tables<'subscriptions'>['status']
    plan_name: string | null
  } | null
}

export type ProfileHistoryEntry = {
  id: string
  kind: 'change' | 'access'
  actor_id: string | null
  actor_name: string
  detail: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  reason: string | null
  created_at: string
}

export type UserActivityDemand = {
  id: string
  titulo: string
  status: string
  created_at: string
}

export type UserActivityOffer = {
  id: string
  demand_id: string
  status: string
  valor: number
  created_at: string
}

export type UserActivityOrder = {
  id: string
  status: string
  role: 'buyer' | 'supplier'
  created_at: string
}

export type UserActivity = {
  demands: UserActivityDemand[]
  offers: UserActivityOffer[]
  orders: UserActivityOrder[]
}

export type DeletionRequestResult = {
  token: string
  expires_at: string
  impact: {
    demands: number
    orders: number
    offers: number
    has_active_subscription: boolean
  }
}

export type CnpjRefreshResult = {
  company: Tables<'companies'>
  changes: ProfileChangeEntry[]
  refreshed: boolean
}

const PAGE_SIZE = 20

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function searchAdminUsers(
  query: string,
  page = 1,
  limit = PAGE_SIZE,
): Promise<{ rows: AdminUserSearchResult[]; total: number }> {
  const offset = (page - 1) * limit
  const { data, error } = await supabase.rpc('search_admin_users', {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error

  const rows = (data ?? []) as AdminUserSearchResult[]
  const total = rows[0]?.total_count ?? 0

  return {
    rows: rows.map((row) => ({
      ...row,
      supplier_status: row.supplier_status ?? null,
      roles: row.roles ?? [],
    })),
    total: Number(total),
  }
}

export async function logProfileAccess(
  targetUserId: string,
  accessType: 'search_result' | 'profile_view' | 'tab_activity' | 'tab_history',
  justification?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('log_profile_access', {
    p_target_user_id: targetUserId,
    p_access_type: accessType,
    p_justification: justification ?? null,
  })

  if (error) throw error
  return data as string
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [profileRes, rolesRes, buyerRes, supplierRes, subRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('buyer_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('supplier_profiles')
      .select('*, companies (*)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('status, plan:plans(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (profileRes.error) throw profileRes.error
  if (rolesRes.error) throw rolesRes.error
  if (buyerRes.error) throw buyerRes.error
  if (supplierRes.error) throw supplierRes.error
  if (subRes.error) throw subRes.error
  if (!profileRes.data) return null

  const roles = (rolesRes.data ?? []).map((r) => r.role as UserRole)
  const supplierRow = supplierRes.data as
    | (Tables<'supplier_profiles'> & { companies: Tables<'companies'> | null })
    | null
  const company = supplierRow?.companies ?? null
  const supplierProfile = supplierRow
    ? (({ companies: _c, ...rest }) => rest)(supplierRow)
    : null

  const plan = unwrapRelation(subRes.data?.plan)

  return {
    profile: profileRes.data,
    roles:
      roles.length > 0
        ? roles
        : profileRes.data.primary_role
          ? [profileRes.data.primary_role]
          : [],
    buyerProfile: buyerRes.data,
    supplierProfile,
    company,
    subscription: subRes.data
      ? { status: subRes.data.status, plan_name: plan?.name ?? null }
      : null,
  }
}

export async function updateAdminUserProfile(
  userId: string,
  changes: AdminUserProfileChanges,
  reason: string,
): Promise<ProfileChangeEntry[]> {
  const { data, error } = await supabase.rpc('admin_update_user_profile', {
    p_target_user_id: userId,
    p_changes: changes,
    p_reason: reason,
  })

  if (error) throw error
  return (data ?? []) as ProfileChangeEntry[]
}

export async function refreshCompanyCnpj(
  companyId: string,
  targetUserId: string,
  reason: string,
): Promise<CnpjRefreshResult> {
  const { data, error } = await supabase.functions.invoke('admin-refresh-cnpj', {
    body: { company_id: companyId, target_user_id: targetUserId, reason },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error.message ?? 'Erro ao reconsultar CNPJ')
  return data as CnpjRefreshResult
}

export async function fetchProfileHistory(
  userId: string,
  limit = 100,
  offset = 0,
): Promise<ProfileHistoryEntry[]> {
  const { data, error } = await supabase.rpc('fetch_profile_history', {
    p_target_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw error
  return (data ?? []) as ProfileHistoryEntry[]
}

export async function fetchUserActivity(userId: string): Promise<UserActivity> {
  const [demandsRes, offersRes, buyerOrdersRes, supplierOrdersRes] = await Promise.all([
    supabase
      .from('demands')
      .select('id, titulo, status, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('offers')
      .select('id, demand_id, status, valor, created_at')
      .eq('supplier_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('supplier_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (demandsRes.error) throw demandsRes.error
  if (offersRes.error) throw offersRes.error
  if (buyerOrdersRes.error) throw buyerOrdersRes.error
  if (supplierOrdersRes.error) throw supplierOrdersRes.error

  const orders: UserActivityOrder[] = [
    ...(buyerOrdersRes.data ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      role: 'buyer' as const,
      created_at: o.created_at,
    })),
    ...(supplierOrdersRes.data ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      role: 'supplier' as const,
      created_at: o.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return {
    demands: (demandsRes.data ?? []) as UserActivityDemand[],
    offers: (offersRes.data ?? []) as UserActivityOffer[],
    orders,
  }
}

export async function requestAccountDeletion(
  userId: string,
  reason: string,
): Promise<DeletionRequestResult> {
  const { data, error } = await supabase.rpc('admin_request_account_deletion', {
    p_user_id: userId,
    p_reason: reason,
  })

  if (error) throw error
  return data as DeletionRequestResult
}

export async function confirmAccountDeletion(token: string, confirmationPhrase: string): Promise<void> {
  const { error } = await supabase.rpc('admin_confirm_account_deletion', {
    p_token: token,
    p_confirmation_phrase: confirmationPhrase,
  })

  if (error) throw error
}

export function accountTypeLabel(user: Pick<AdminUserSearchResult, 'roles' | 'has_buyer_profile' | 'supplier_status'>) {
  const isBuyer = user.roles.includes('buyer') || user.has_buyer_profile
  const isSupplier = user.roles.includes('supplier') || user.supplier_status != null
  if (isBuyer && isSupplier) return 'Comprador e fornecedor'
  if (isSupplier) return 'Fornecedor'
  if (isBuyer) return 'Comprador'
  return 'Sem perfil'
}
