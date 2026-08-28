import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Order = Tables<'orders'>
export type OrderStatus = Order['status']
export type OrderStatusLog = Tables<'order_status_logs'>
export type OrderSlaDeadline = Tables<'order_sla_deadlines'>

export type OrderRole = 'buyer' | 'supplier'

export type SupplierOrderListItem = Order & {
  created_at: string
  demand: {
    titulo: string
    descricao: string | null
    cidade: string
    uf: string
    unidade: string
    quantidade: number
  } | null
  offer: {
    valor: number
    prazo_entrega_dias: number
    prazo_entrega_em: string | null
    quantidade: number
    mensagem: string | null
  } | null
  buyer: {
    full_name: string
    phone: string | null
    email: string | null
  } | null
  logs: Array<{
    to_status: OrderStatus
    created_at: string
  }>
}

export type BuyerOrderCompany = {
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  cidade: string
  uf: string
}

export type BuyerOrderListItem = Order & {
  demand: {
    titulo: string
    cidade: string
    uf: string
  } | null
  offer: {
    valor: number
    prazo_entrega_dias: number
    prazo_entrega_em: string | null
    quantidade: number
  } | null
  supplier: {
    store_name: string | null
    avg_rating: number
    total_ratings: number
    profile: {
      full_name: string
      phone: string | null
    } | null
    company: BuyerOrderCompany | null
  } | null
  logs: Array<{
    to_status: OrderStatus
    created_at: string
  }>
}

type NestedOrderProfile = {
  profile?: { full_name: string; phone?: string | null; email?: string | null } | null
  profiles?: { full_name: string; phone?: string | null; email?: string | null } | null
} | null

function unwrapOrderProfile(row: NestedOrderProfile) {
  if (!row) return null
  return row.profile ?? row.profiles ?? null
}

type NestedSupplierRow = {
  store_name?: string | null
  avg_rating?: number
  total_ratings?: number
  profile?: { full_name: string; phone?: string | null } | null
  profiles?: { full_name: string; phone?: string | null } | null
  company?: BuyerOrderCompany | null
} | null

function mapSupplierOrderRow(row: Record<string, unknown>): SupplierOrderListItem {
  const { buyer: buyerRow, logs: rawLogs, ...rest } = row
  const profile = unwrapOrderProfile(buyerRow as NestedOrderProfile)
  const logs = (Array.isArray(rawLogs) ? rawLogs : []) as SupplierOrderListItem['logs']
  logs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return {
    ...(rest as SupplierOrderListItem),
    buyer: profile
      ? {
          full_name: profile.full_name,
          phone: profile.phone ?? null,
          email: profile.email ?? null,
        }
      : null,
    logs,
  }
}

function mapBuyerOrderRow(row: Record<string, unknown>): BuyerOrderListItem {
  const { supplier: supplierRow, logs: rawLogs, ...rest } = row
  const logs = (Array.isArray(rawLogs) ? rawLogs : []) as BuyerOrderListItem['logs']
  logs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const supplier = supplierRow as NestedSupplierRow
  const profile = supplier ? unwrapOrderProfile(supplier as NestedOrderProfile) : null

  return {
    ...(rest as BuyerOrderListItem),
    logs,
    supplier: supplier
      ? {
          store_name: supplier.store_name ?? null,
          avg_rating: supplier.avg_rating ?? 0,
          total_ratings: supplier.total_ratings ?? 0,
          profile: profile
            ? {
                full_name: profile.full_name,
                phone: profile.phone ?? null,
              }
            : null,
          company: supplier.company ?? null,
        }
      : null,
  }
}

export async function fetchOrders(
  userId: string,
  role: OrderRole,
): Promise<Order[] | SupplierOrderListItem[] | BuyerOrderListItem[]> {
  if (role === 'supplier') {
    return fetchSupplierOrdersWithDetails(userId)
  }
  return fetchBuyerOrdersWithDetails(userId)
}

export async function fetchSupplierOrdersWithDetails(userId: string): Promise<SupplierOrderListItem[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      demand:demands(titulo, descricao, cidade, uf, unidade, quantidade),
      offer:offers(valor, prazo_entrega_dias, prazo_entrega_em, quantidade, mensagem),
      buyer:buyer_profiles!orders_buyer_id_fkey(
        profiles(full_name, phone, email)
      ),
      logs:order_status_logs(to_status, created_at)
    `,
    )
    .eq('supplier_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapSupplierOrderRow(row as Record<string, unknown>))
}

export async function fetchBuyerOrdersWithDetails(userId: string): Promise<BuyerOrderListItem[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      demand:demands(titulo, cidade, uf),
      offer:offers(valor, prazo_entrega_dias, prazo_entrega_em, quantidade),
      supplier:supplier_profiles!orders_supplier_id_fkey(
        store_name,
        avg_rating,
        total_ratings,
        profiles(full_name, phone),
        company:companies(logradouro, numero, bairro, cep, cidade, uf)
      ),
      logs:order_status_logs(to_status, created_at)
    `,
    )
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapBuyerOrderRow(row as Record<string, unknown>))
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Order | null
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  cancelReason?: string,
): Promise<Order> {
  const payload: Partial<Order> = { status }
  if (cancelReason !== undefined) {
    payload.cancel_reason = cancelReason
  }

  const { data, error } = await supabase.from('orders').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Order
}

export async function fetchOrderLogs(orderId: string): Promise<OrderStatusLog[]> {
  const { data, error } = await supabase
    .from('order_status_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as OrderStatusLog[]
}

export async function fetchSlaDeadlines(orderId: string): Promise<OrderSlaDeadline[]> {
  const { data, error } = await supabase
    .from('order_sla_deadlines')
    .select('*')
    .eq('order_id', orderId)
    .order('deadline_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as OrderSlaDeadline[]
}

export type OrderAttachmentType = 'payment_proof' | 'tracking_info' | 'other'

export type OrderAttachment = {
  id: string
  order_id: string
  uploaded_by: string
  attachment_type: OrderAttachmentType
  storage_path: string
  file_name: string
  mime_type: string | null
  tracking_code: string | null
  tracking_url: string | null
  notes: string | null
  created_at: string
}

export type CreateOrderAttachmentInput = {
  orderId: string
  uploadedBy: string
  attachmentType: OrderAttachmentType
  storagePath: string
  fileName: string
  mimeType?: string
  trackingCode?: string
  trackingUrl?: string
  notes?: string
}

export async function fetchOrderAttachments(orderId: string): Promise<OrderAttachment[]> {
  const { data, error } = await supabase
    .from('order_attachments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as OrderAttachment[]
}

export async function createOrderAttachment(input: CreateOrderAttachmentInput): Promise<OrderAttachment> {
  const { data, error } = await supabase
    .from('order_attachments')
    .insert({
      order_id: input.orderId,
      uploaded_by: input.uploadedBy,
      attachment_type: input.attachmentType,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType ?? null,
      tracking_code: input.trackingCode ?? null,
      tracking_url: input.trackingUrl ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as OrderAttachment
}
