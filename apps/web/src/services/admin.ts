import { supabase } from '@/lib/supabase'
import type { SupplierStatus, Tables, UserRole } from '@keve/shared'

export type SupplierProfile = Tables<'supplier_profiles'>
export type Category = Tables<'categories'>
export type AuditLog = Tables<'audit_logs'>
export type Plan = Tables<'plans'>

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

export type MetricsPeriod = 7 | 30 | 90

export type DailyMetricPoint = {
  date: string
  label: string
  users: number
  demands: number
  offers: number
  orders: number
}

export type PeriodCounts = {
  newUsers: number
  newBuyers: number
  newSuppliers: number
  newDemands: number
  newOffers: number
  newOrders: number
  newSubscriptions: number
  newSubscriptionMrr: number
  newPendingApprovals: number
}

export type MetricTrend = {
  current: number
  previous: number
  changePercent: number
  direction: 'up' | 'down' | 'flat'
}

export type AdminMetricsDashboard = AdminMetrics & {
  period: MetricsPeriod
  periodCounts: PeriodCounts
  previousPeriodCounts: PeriodCounts
  trends: {
    newUsers: MetricTrend
    newBuyers: MetricTrend
    newSuppliers: MetricTrend
    newDemands: MetricTrend
    newOffers: MetricTrend
    newOrders: MetricTrend
    newSubscriptions: MetricTrend
    newSubscriptionMrr: MetricTrend
    newPendingApprovals: MetricTrend
    activeSubscriptions: MetricTrend
    mrr: MetricTrend
  }
  daily: DailyMetricPoint[]
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
  return fetchMetricsDashboard(30)
}

function getPeriodStart(period: MetricsPeriod): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (period - 1))
  return start
}

function getPreviousPeriodStart(period: MetricsPeriod): Date {
  const start = getPeriodStart(period)
  start.setDate(start.getDate() - period)
  return start
}

export function computeMetricTrend(current: number, previous: number): MetricTrend {
  if (previous === 0) {
    if (current === 0) {
      return { current, previous, changePercent: 0, direction: 'flat' }
    }
    return { current, previous, changePercent: 100, direction: 'up' }
  }

  const changePercent = ((current - previous) / previous) * 100
  if (Math.abs(changePercent) < 0.05) {
    return { current, previous, changePercent: 0, direction: 'flat' }
  }

  return {
    current,
    previous,
    changePercent,
    direction: changePercent > 0 ? 'up' : 'down',
  }
}

function sumActiveSubscriptionMrr(
  rows: { status: string; plan: { price?: number } | null }[] | null | undefined,
): number {
  return (rows ?? []).reduce((sum, row) => {
    if (row.status !== 'active') return sum
    const plan = row.plan as { price?: number } | null
    return sum + (plan?.price ?? 0)
  }, 0)
}

async function fetchPeriodCounts(since: string, until?: string): Promise<PeriodCounts> {
  let profilesQuery = supabase.from('profiles').select('created_at').gte('created_at', since)
  let buyersQuery = supabase.from('buyer_profiles').select('created_at').gte('created_at', since)
  let suppliersQuery = supabase.from('supplier_profiles').select('created_at').gte('created_at', since)
  let demandsQuery = supabase
    .from('demands')
    .select('published_at')
    .not('published_at', 'is', null)
    .gte('published_at', since)
  let offersQuery = supabase.from('offers').select('created_at').gte('created_at', since)
  let ordersQuery = supabase.from('orders').select('created_at').gte('created_at', since)
  let subscriptionsQuery = supabase
    .from('subscriptions')
    .select('created_at, status, plan:plans(price)')
    .gte('created_at', since)
  let pendingQuery = supabase
    .from('supplier_profiles')
    .select('updated_at')
    .in('status', ['em_revisao', 'pendente'])
    .gte('updated_at', since)

  if (until) {
    profilesQuery = profilesQuery.lt('created_at', until)
    buyersQuery = buyersQuery.lt('created_at', until)
    suppliersQuery = suppliersQuery.lt('created_at', until)
    demandsQuery = demandsQuery.lt('published_at', until)
    offersQuery = offersQuery.lt('created_at', until)
    ordersQuery = ordersQuery.lt('created_at', until)
    subscriptionsQuery = subscriptionsQuery.lt('created_at', until)
    pendingQuery = pendingQuery.lt('updated_at', until)
  }

  const [
    profilesRes,
    buyersRes,
    suppliersRes,
    demandsRes,
    offersRes,
    ordersRes,
    subscriptionsRes,
    pendingRes,
  ] = await Promise.all([
    profilesQuery,
    buyersQuery,
    suppliersQuery,
    demandsQuery,
    offersQuery,
    ordersQuery,
    subscriptionsQuery,
    pendingQuery,
  ])

  if (profilesRes.error) throw profilesRes.error
  if (buyersRes.error) throw buyersRes.error
  if (suppliersRes.error) throw suppliersRes.error
  if (demandsRes.error) throw demandsRes.error
  if (offersRes.error) throw offersRes.error
  if (ordersRes.error) throw ordersRes.error
  if (subscriptionsRes.error) throw subscriptionsRes.error
  if (pendingRes.error) throw pendingRes.error

  const subscriptions = subscriptionsRes.data ?? []

  return {
    newUsers: profilesRes.data?.length ?? 0,
    newBuyers: buyersRes.data?.length ?? 0,
    newSuppliers: suppliersRes.data?.length ?? 0,
    newDemands: demandsRes.data?.length ?? 0,
    newOffers: offersRes.data?.length ?? 0,
    newOrders: ordersRes.data?.length ?? 0,
    newSubscriptions: subscriptions.length,
    newSubscriptionMrr: sumActiveSubscriptionMrr(subscriptions),
    newPendingApprovals: pendingRes.data?.length ?? 0,
  }
}

function buildDailyBuckets(period: MetricsPeriod): DailyMetricPoint[] {
  const buckets: DailyMetricPoint[] = []
  const start = getPeriodStart(period)

  for (let i = 0; i < period; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const date = day.toISOString().slice(0, 10)
    buckets.push({
      date,
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      users: 0,
      demands: 0,
      offers: 0,
      orders: 0,
    })
  }

  return buckets
}

function incrementDaily(
  buckets: DailyMetricPoint[],
  isoDate: string,
  field: keyof Pick<DailyMetricPoint, 'users' | 'demands' | 'offers' | 'orders'>,
) {
  const key = isoDate.slice(0, 10)
  const bucket = buckets.find((item) => item.date === key)
  if (bucket) bucket[field] += 1
}

export async function fetchMetricsDashboard(
  period: MetricsPeriod = 30,
): Promise<AdminMetricsDashboard> {
  const currentStart = getPeriodStart(period).toISOString()
  const previousStart = getPreviousPeriodStart(period).toISOString()
  const daily = buildDailyBuckets(period)

  const [
    profilesRes,
    buyersRes,
    suppliersRes,
    pendingRes,
    demandsRes,
    offersRes,
    subscriptionsRes,
    periodCounts,
    previousPeriodCounts,
    periodProfilesRes,
    periodDemandsRes,
    periodOffersRes,
    periodOrdersRes,
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
    fetchPeriodCounts(currentStart),
    fetchPeriodCounts(previousStart, currentStart),
    supabase.from('profiles').select('created_at').gte('created_at', currentStart),
    supabase
      .from('demands')
      .select('published_at')
      .not('published_at', 'is', null)
      .gte('published_at', currentStart),
    supabase.from('offers').select('created_at').gte('created_at', currentStart),
    supabase.from('orders').select('created_at').gte('created_at', currentStart),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (buyersRes.error) throw buyersRes.error
  if (suppliersRes.error) throw suppliersRes.error
  if (pendingRes.error) throw pendingRes.error
  if (demandsRes.error) throw demandsRes.error
  if (offersRes.error) throw offersRes.error
  if (subscriptionsRes.error) throw subscriptionsRes.error
  if (periodProfilesRes.error) throw periodProfilesRes.error
  if (periodDemandsRes.error) throw periodDemandsRes.error
  if (periodOffersRes.error) throw periodOffersRes.error
  if (periodOrdersRes.error) throw periodOrdersRes.error

  for (const row of periodProfilesRes.data ?? []) {
    incrementDaily(daily, row.created_at, 'users')
  }
  for (const row of periodDemandsRes.data ?? []) {
    if (row.published_at) incrementDaily(daily, row.published_at, 'demands')
  }
  for (const row of periodOffersRes.data ?? []) {
    incrementDaily(daily, row.created_at, 'offers')
  }
  for (const row of periodOrdersRes.data ?? []) {
    incrementDaily(daily, row.created_at, 'orders')
  }

  const mrr = (subscriptionsRes.data ?? []).reduce((sum, row) => {
    const plan = row.plan as { price?: number } | null
    return sum + (plan?.price ?? 0)
  }, 0)

  const activeSubscriptions = subscriptionsRes.data?.length ?? 0

  const trends = {
    newUsers: computeMetricTrend(periodCounts.newUsers, previousPeriodCounts.newUsers),
    newBuyers: computeMetricTrend(periodCounts.newBuyers, previousPeriodCounts.newBuyers),
    newSuppliers: computeMetricTrend(periodCounts.newSuppliers, previousPeriodCounts.newSuppliers),
    newDemands: computeMetricTrend(periodCounts.newDemands, previousPeriodCounts.newDemands),
    newOffers: computeMetricTrend(periodCounts.newOffers, previousPeriodCounts.newOffers),
    newOrders: computeMetricTrend(periodCounts.newOrders, previousPeriodCounts.newOrders),
    newSubscriptions: computeMetricTrend(
      periodCounts.newSubscriptions,
      previousPeriodCounts.newSubscriptions,
    ),
    newSubscriptionMrr: computeMetricTrend(
      periodCounts.newSubscriptionMrr,
      previousPeriodCounts.newSubscriptionMrr,
    ),
    newPendingApprovals: computeMetricTrend(
      periodCounts.newPendingApprovals,
      previousPeriodCounts.newPendingApprovals,
    ),
    activeSubscriptions: computeMetricTrend(
      periodCounts.newSubscriptions,
      previousPeriodCounts.newSubscriptions,
    ),
    mrr: computeMetricTrend(
      periodCounts.newSubscriptionMrr,
      previousPeriodCounts.newSubscriptionMrr,
    ),
  }

  return {
    totalUsers: profilesRes.count ?? 0,
    totalBuyers: buyersRes.count ?? 0,
    totalSuppliers: suppliersRes.count ?? 0,
    pendingApprovals: pendingRes.count ?? 0,
    publishedDemands: demandsRes.count ?? 0,
    offersSent: offersRes.count ?? 0,
    activeSubscriptions,
    mrr,
    period,
    periodCounts,
    previousPeriodCounts,
    trends,
    daily,
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

export type PlanInput = {
  name: string
  description?: string | null
  price: number
  trial_days: number
  max_demands_monthly: number | null
  max_offers_monthly: number | null
  max_catalog_items: number
  match_priority: boolean
  is_active: boolean
  sort_order: number
}

export type PlanSubscriptionBreakdown = {
  planId: string
  planCode: string
  planName: string
  planPrice: number
  activeCount: number
  trialingCount: number
  totalCount: number
  mrrContribution: number
}

export type FinancialReports = {
  mrr: number
  arr: number
  subscriptionsByStatus: Record<string, number>
  planBreakdown: PlanSubscriptionBreakdown[]
  totalSubscriptions: number
  gmvAcceptedOffers: number
  gmvCompletedOrders: number
  acceptedOffersCount: number
  completedOrdersCount: number
  ordersByStatus: Record<string, number>
  totalOrders: number
  avgCompletedOrderValue: number
}

const COMPLETED_ORDER_STATUSES = ['CONCLUIDO', 'ENTREGUE'] as const

export async function fetchPlansAdmin(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Plan[]
}

export async function updatePlan(id: string, input: Partial<PlanInput>): Promise<Plan> {
  const payload: Record<string, unknown> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description
  if (input.price !== undefined) payload.price = input.price
  if (input.trial_days !== undefined) payload.trial_days = input.trial_days
  if (input.max_demands_monthly !== undefined) payload.max_demands_monthly = input.max_demands_monthly
  if (input.max_offers_monthly !== undefined) payload.max_offers_monthly = input.max_offers_monthly
  if (input.max_catalog_items !== undefined) payload.max_catalog_items = input.max_catalog_items
  if (input.match_priority !== undefined) payload.match_priority = input.match_priority
  if (input.is_active !== undefined) payload.is_active = input.is_active
  if (input.sort_order !== undefined) payload.sort_order = input.sort_order

  const { data, error } = await supabase.from('plans').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Plan
}

export async function fetchFinancialReports(): Promise<FinancialReports> {
  const [subscriptionsRes, acceptedOffersRes, ordersRes, plansRes] = await Promise.all([
    supabase.from('subscriptions').select('status, plan:plans(id, code, name, price)'),
    supabase.from('offers').select('valor').eq('status', 'aceita'),
    supabase.from('orders').select('status, offer:offers(valor)'),
    supabase.from('plans').select('id, code, name, price, sort_order').order('sort_order', { ascending: true }),
  ])

  if (subscriptionsRes.error) throw subscriptionsRes.error
  if (acceptedOffersRes.error) throw acceptedOffersRes.error
  if (ordersRes.error) throw ordersRes.error
  if (plansRes.error) throw plansRes.error

  const subscriptions = subscriptionsRes.data ?? []
  const subscriptionsByStatus: Record<string, number> = {}
  const planMap = new Map<string, PlanSubscriptionBreakdown>()

  for (const plan of plansRes.data ?? []) {
    planMap.set(plan.id, {
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      planPrice: plan.price ?? 0,
      activeCount: 0,
      trialingCount: 0,
      totalCount: 0,
      mrrContribution: 0,
    })
  }

  for (const sub of subscriptions) {
    const status = sub.status ?? 'unknown'
    subscriptionsByStatus[status] = (subscriptionsByStatus[status] ?? 0) + 1

    const plan = sub.plan as { id: string; code: string; name: string; price: number } | null
    if (!plan) continue

    const existing = planMap.get(plan.id) ?? {
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      planPrice: plan.price ?? 0,
      activeCount: 0,
      trialingCount: 0,
      totalCount: 0,
      mrrContribution: 0,
    }

    existing.totalCount += 1
    if (status === 'active') {
      existing.activeCount += 1
      existing.mrrContribution += plan.price ?? 0
    }
    if (status === 'trialing') existing.trialingCount += 1
    planMap.set(plan.id, existing)
  }

  const mrr = Array.from(planMap.values()).reduce((sum, row) => sum + row.mrrContribution, 0)

  const acceptedOffers = acceptedOffersRes.data ?? []
  const gmvAcceptedOffers = acceptedOffers.reduce((sum, row) => sum + (row.valor ?? 0), 0)

  const orders = ordersRes.data ?? []
  const ordersByStatus: Record<string, number> = {}
  let gmvCompletedOrders = 0
  let completedOrdersCount = 0

  for (const order of orders) {
    const status = order.status ?? 'unknown'
    ordersByStatus[status] = (ordersByStatus[status] ?? 0) + 1

    if (COMPLETED_ORDER_STATUSES.includes(status as (typeof COMPLETED_ORDER_STATUSES)[number])) {
      const offer = order.offer as { valor?: number } | null
      gmvCompletedOrders += offer?.valor ?? 0
      completedOrdersCount += 1
    }
  }

  return {
    mrr,
    arr: mrr * 12,
    subscriptionsByStatus,
    planBreakdown: (plansRes.data ?? [])
      .map((plan) => planMap.get(plan.id))
      .filter((row): row is PlanSubscriptionBreakdown => row != null),
    totalSubscriptions: subscriptions.length,
    gmvAcceptedOffers,
    gmvCompletedOrders,
    acceptedOffersCount: acceptedOffers.length,
    completedOrdersCount,
    ordersByStatus,
    totalOrders: orders.length,
    avgCompletedOrderValue: completedOrdersCount > 0 ? gmvCompletedOrders / completedOrdersCount : 0,
  }
}

export type SubscriptionStatus = Tables<'subscriptions'>['status']

export type AdminSubscription = Tables<'subscriptions'> & {
  plan: Plan | null
  profiles: {
    full_name: string
    email: string | null
    primary_role: string | null
  } | null
}

export type SubscriptionFilters = {
  status?: SubscriptionStatus
  planId?: string
  search?: string
}

export type UpdateSubscriptionInput = {
  plan_id?: string
  status?: SubscriptionStatus
}

const SUBSCRIPTION_SELECT = `
  *,
  plan:plans(*),
  profiles (full_name, email, primary_role)
`

export async function fetchAdminSubscriptions(
  filters?: SubscriptionFilters,
): Promise<AdminSubscription[]> {
  let query = supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_SELECT)
    .order('updated_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.planId) query = query.eq('plan_id', filters.planId)

  const { data, error } = await query
  if (error) throw error

  let rows = (data ?? []) as AdminSubscription[]
  const search = filters?.search?.trim().toLowerCase()
  if (search) {
    rows = rows.filter((row) => {
      const email = row.profiles?.email?.toLowerCase() ?? ''
      const name = row.profiles?.full_name?.toLowerCase() ?? ''
      return email.includes(search) || name.includes(search)
    })
  }

  return rows
}

export async function updateAdminSubscription(
  id: string,
  input: UpdateSubscriptionInput,
  metadata: Record<string, unknown> = {},
): Promise<AdminSubscription> {
  const payload: Record<string, unknown> = {}
  if (input.plan_id !== undefined) payload.plan_id = input.plan_id
  if (input.status !== undefined) {
    payload.status = input.status
    if (input.status === 'canceled') {
      payload.canceled_at = new Date().toISOString()
    } else if (input.status === 'active') {
      payload.canceled_at = null
    }
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update(payload)
    .eq('id', id)
    .select(SUBSCRIPTION_SELECT)
    .single()

  if (error) throw error

  await supabase.from('audit_logs').insert({
    action: 'subscription.updated',
    entity_type: 'subscriptions',
    entity_id: id,
    metadata: { ...metadata, ...input },
  })

  return data as AdminSubscription
}

export type AdminUser = {
  id: string
  email: string | null
  full_name: string
  phone: string | null
  primary_role: UserRole | null
  is_active: boolean
  created_at: string
  updated_at: string
  roles: UserRole[]
  supplier_status: SupplierStatus | null
  has_buyer_profile: boolean
  subscription_status: SubscriptionStatus | null
  subscription_plan_name: string | null
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const [profilesRes, rolesRes, suppliersRes, buyersRes, subsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, phone, primary_role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('supplier_profiles').select('user_id, status'),
    supabase.from('buyer_profiles').select('user_id'),
    supabase.from('subscriptions').select('user_id, status, plan:plans(name)'),
  ])

  if (profilesRes.error) throw profilesRes.error
  if (rolesRes.error) throw rolesRes.error
  if (suppliersRes.error) throw suppliersRes.error
  if (buyersRes.error) throw buyersRes.error
  if (subsRes.error) throw subsRes.error

  const rolesByUser = new Map<string, UserRole[]>()
  for (const row of rolesRes.data ?? []) {
    const userId = row.user_id as string
    const role = row.role as UserRole
    const list = rolesByUser.get(userId) ?? []
    if (!list.includes(role)) list.push(role)
    rolesByUser.set(userId, list)
  }

  const supplierByUser = new Map<string, SupplierStatus>()
  for (const row of suppliersRes.data ?? []) {
    supplierByUser.set(row.user_id, row.status as SupplierStatus)
  }

  const buyerIds = new Set((buyersRes.data ?? []).map((row) => row.user_id))

  type SubRow = {
    user_id: string
    status: SubscriptionStatus
    plan: { name: string } | null
  }
  const subscriptionByUser = new Map<string, { status: SubscriptionStatus; planName: string | null }>()
  for (const row of (subsRes.data ?? []) as SubRow[]) {
    subscriptionByUser.set(row.user_id, {
      status: row.status,
      planName: row.plan?.name ?? null,
    })
  }

  return (profilesRes.data ?? []).map((profile) => {
    const rolesFromTable = rolesByUser.get(profile.id) ?? []
    const primaryRole = profile.primary_role as UserRole | null
    const roles =
      rolesFromTable.length > 0
        ? rolesFromTable
        : primaryRole
          ? [primaryRole]
          : []

    const subscription = subscriptionByUser.get(profile.id)

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      primary_role: primaryRole,
      is_active: profile.is_active,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      roles,
      supplier_status: supplierByUser.get(profile.id) ?? null,
      has_buyer_profile: buyerIds.has(profile.id),
      subscription_status: subscription?.status ?? null,
      subscription_plan_name: subscription?.planName ?? null,
    }
  })
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_user_active_status', {
    p_user_id: userId,
    p_is_active: isActive,
  })

  if (error) throw error

  await supabase.from('audit_logs').insert({
    action: isActive ? 'user.reactivated' : 'user.deactivated',
    entity_type: 'profiles',
    entity_id: userId,
    metadata: { is_active: isActive },
  })
}
