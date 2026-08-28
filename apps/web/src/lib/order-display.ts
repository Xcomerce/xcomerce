import { ORDER_PRODUCTION_STATUSES } from '@keve/shared'
import type { OrderStatus } from '@/services/orders'

export type OrderTimelineEvent = {
  label: string
  at: string
}

function parseDate(value: string | Date): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatOrderEventDateTime(value: string | Date | null | undefined): string {
  const date = value ? parseDate(value) : null
  if (!date) return '—'

  const datePart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${datePart} às ${timePart}`
}

export function formatPickupDate(value: string | Date | null | undefined): string {
  const date = value ? parseDate(value) : null
  if (!date) return '—'

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPickupHeadline(value: string | Date | null | undefined): string {
  const date = value ? parseDate(value) : null
  if (!date) return '—'

  const now = new Date()
  const timePart = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday) return `Hoje, ${timePart}`
  if (isYesterday) return `Ontem, ${timePart}`

  const datePart = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

export function isPickupOverdue(
  pickupAt: string | null | undefined,
  orderStatus: OrderStatus,
): boolean {
  if (!pickupAt || !ORDER_PRODUCTION_STATUSES.includes(orderStatus)) return false

  const date = parseDate(pickupAt)
  if (!date) return false

  return date.getTime() < Date.now()
}

export function buildOrderCardTimeline(
  order: { created_at: string },
  logs: Array<{ to_status: OrderStatus; created_at: string }>,
): OrderTimelineEvent[] {
  const events: OrderTimelineEvent[] = []

  if (order.created_at) {
    events.push({ label: 'Pedido feito', at: order.created_at })
  }

  const paymentLog = logs.find((log) => log.to_status === 'PAGAMENTO_CONFIRMADO')
  if (paymentLog) {
    events.push({ label: 'Pagamento confirmado', at: paymentLog.created_at })
  }

  return events
}

export function getPickupTimestamp(order: {
  offer?: { prazo_entrega_em?: string | null } | null
}): string | null {
  return order.offer?.prazo_entrega_em ?? null
}
