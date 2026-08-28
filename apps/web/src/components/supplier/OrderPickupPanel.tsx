import { Clock } from 'lucide-react'
import {
  formatPickupDate,
  formatPickupHeadline,
  isPickupOverdue,
} from '@/lib/order-display'
import type { OrderStatus } from '@/services/orders'
import { cn } from '@/lib/utils'

type OrderPickupPanelProps = {
  pickupAt: string | null | undefined
  prazoEntregaDias?: number | null
  orderStatus: OrderStatus
  overdueLabel?: string
  className?: string
}

export function OrderPickupPanel({
  pickupAt,
  prazoEntregaDias,
  orderStatus,
  overdueLabel = 'Prazo vencido',
  className,
}: OrderPickupPanelProps) {
  if (!pickupAt) {
    if (!prazoEntregaDias) return null

    return (
      <div
        className={cn(
          'rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3',
          className,
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Retirada</p>
        <p className="mt-1 text-sm font-semibold text-rose-900">
          Em {prazoEntregaDias} {prazoEntregaDias === 1 ? 'dia' : 'dias'}
        </p>
      </div>
    )
  }

  const overdue = isPickupOverdue(pickupAt, orderStatus)

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        overdue ? 'border-rose-200 bg-rose-50/80' : 'border-rose-100 bg-rose-50/60',
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Retirada</p>
      <p className={cn('mt-1 text-base font-bold', overdue ? 'text-rose-700' : 'text-rose-900')}>
        {formatPickupHeadline(pickupAt)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{formatPickupDate(pickupAt)}</p>
      {overdue ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-destructive">
          <Clock className="h-3.5 w-3.5" />
          {overdueLabel}
        </p>
      ) : null}
    </div>
  )
}
