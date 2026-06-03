import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Order = Tables<'orders'>
export type OrderStatus = Order['status']
export type OrderStatusLog = Tables<'order_status_logs'>
export type OrderSlaDeadline = Tables<'order_sla_deadlines'>

export type OrderRole = 'buyer' | 'supplier'

export async function fetchOrders(userId: string, role: OrderRole): Promise<Order[]> {
  const column = role === 'buyer' ? 'buyer_id' : 'supplier_id'
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Order[]
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
