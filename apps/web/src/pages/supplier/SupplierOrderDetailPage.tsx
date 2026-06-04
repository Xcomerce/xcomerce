import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useOrder,
  useOrderLogs,
  useOrderSlaDeadlines,
  useUpdateOrderStatus,
} from '@/hooks/use-orders'
import type { OrderStatus } from '@/services/orders'
import { translateSupabaseError } from '@/lib/errors'
import { ORDER_STATUS_LABELS } from '@keve/shared'

const SUPPLIER_ACTIONS: Partial<
  Record<OrderStatus, { next: OrderStatus; label: string }[]>
> = {
  PROPOSTA_ACEITA: [
    { next: 'AGUARDANDO_CONFIRMACAO_EXTERNA', label: 'Aguardar confirmação externa' },
  ],
  PAGAMENTO_INFORMADO: [{ next: 'ENVIO_INFORMADO', label: 'Informar envio' }],
  ENTREGUE: [{ next: 'CONCLUIDO', label: 'Confirmar conclusão' }],
}

export function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const { data: order, isLoading } = useOrder(id)
  const { data: logs = [] } = useOrderLogs(id)
  const { data: slas = [] } = useOrderSlaDeadlines(id)
  const updateStatus = useUpdateOrderStatus()

  async function handleStatus(next: OrderStatus) {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: next })
      toast.success('Status atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleCancel() {
    if (!id || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento')
      return
    }
    try {
      await updateStatus.mutateAsync({
        id,
        status: 'CANCELADO',
        cancelReason: cancelReason.trim(),
      })
      toast.success('Pedido cancelado')
      setShowCancel(false)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button className="mt-4" asChild>
          <Link to="/supplier/orders">Voltar</Link>
        </Button>
      </div>
    )
  }

  const actions = SUPPLIER_ACTIONS[order.status] ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/supplier/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-xs font-medium text-foreground tracking-wider bg-transparent">
              ID#{order.id.slice(0, 8).toUpperCase()}
            </div>
            <StatusBadge status={order.status} kind="order" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.next}
                disabled={updateStatus.isPending}
                onClick={() => handleStatus(action.next)}
              >
                {action.label}
              </Button>
            ))}
            {order.status !== 'CANCELADO' && order.status !== 'CONCLUIDO' && (
              <Button variant="outline" onClick={() => setShowCancel(!showCancel)}>
                Cancelar pedido
              </Button>
            )}
          </div>
          {showCancel && (
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                Confirmar cancelamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {slas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Prazos SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slas.map((sla) => (
              <div key={sla.id} className="flex justify-between text-sm">
                <span>{sla.action}</span>
                <span className="text-muted-foreground">
                  {new Date(sla.deadline_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                  <p className="font-medium">
                    {log.from_status
                      ? `${ORDER_STATUS_LABELS[log.from_status] ?? log.from_status} → `
                      : ''}
                    {ORDER_STATUS_LABELS[log.to_status] ?? log.to_status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </p>
                  {log.notes && <p className="mt-1 text-muted-foreground">{log.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
