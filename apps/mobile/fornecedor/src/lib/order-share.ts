import { Share } from 'react-native'
import type { SupplierOrderListItem } from '@/services/orders'
import { ORDER_STATUS_LABELS } from '@keve/shared'
import { formatCurrency, formatShortId } from '@/lib/utils'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

export async function shareOrderSummary(order: SupplierOrderListItem): Promise<void> {
  const lines = [
    `Pedido #${formatShortId(order.id)}`,
    ORDER_STATUS_LABELS[order.status] ?? order.status,
    '',
    order.demand?.titulo ? `Pedido: ${order.demand.titulo}` : null,
    order.demand ? `Local: ${order.demand.cidade}/${order.demand.uf}` : null,
    order.offer ? `Valor: ${formatCurrency(order.offer.valor)}` : null,
    order.offer && order.demand
      ? `Quantidade: ${order.offer.quantidade} ${order.demand.unidade}`
      : null,
    order.offer
      ? `Prazo: ${order.offer.prazo_entrega_dias} ${order.offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}`
      : null,
    '',
    order.buyer ? `Cliente: ${order.buyer.full_name}` : null,
    order.buyer?.phone ? `Telefone: ${formatPhone(order.buyer.phone)}` : null,
    order.buyer?.email ? `E-mail: ${order.buyer.email}` : null,
  ].filter(Boolean)

  await Share.share({ message: lines.join('\n'), title: `Pedido #${formatShortId(order.id)}` })
}
