import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  useOrder,
  useOrderLogs,
  useUpdateOrderStatus,
} from '@/hooks/use-orders'
import { useDemand } from '@/hooks/use-demands'
import { useOfferDetail } from '@/hooks/use-offers'
import { useCategories } from '@/hooks/use-categories'
import type { OrderStatus } from '@/services/orders'
import { translateSupabaseError } from '@/lib/errors'
import { ORDER_STATUS_LABELS } from '@keve/shared'
import { cn } from '@/lib/utils'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

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
  const { data: demand } = useDemand(order?.demand_id)
  const { data: offer } = useOfferDetail(order?.offer_id)
  const { data: categories = [] } = useCategories()
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
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid flex-1 gap-6 p-4 lg:grid-cols-2 lg:p-6">
          <LoadingSkeleton className="h-64 w-full rounded-2xl" />
          <LoadingSkeleton className="h-56 w-full rounded-2xl" />
        </div>
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
  const canCancel = order.status !== 'CANCELADO' && order.status !== 'CONCLUIDO'
  const showFooter = actions.length > 0 || canCancel
  const categoryName = categories.find((c) => c.id === demand?.category_id)?.name
  const orderCreatedAt = (order as { created_at?: string }).created_at

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderHistoryList logs={logs} />
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Resumo do pedido</CardTitle>
                  <StatusBadge status={order.status} kind="order" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {demand && (
                  <div>
                    <p className="font-semibold leading-snug">{demand.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {demand.descricao}
                    </p>
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <SummaryItem label="Categoria" value={categoryName ?? '—'} />
                  <SummaryItem
                    label="Localização"
                    value={demand ? `${demand.cidade}/${demand.uf}` : '—'}
                  />
                  <SummaryItem
                    label="Quantidade"
                    value={
                      offer && demand
                        ? `${offer.quantidade} ${demand.unidade}`
                        : offer
                          ? String(offer.quantidade)
                          : '—'
                    }
                  />
                  <SummaryItem
                    label="Valor total"
                    value={offer ? formatCurrency(offer.valor) : '—'}
                  />
                  <SummaryItem
                    label="Prazo de entrega"
                    value={
                      offer ? `${offer.prazo_entrega_dias} ${offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}` : '—'
                    }
                  />
                  <SummaryItem
                    label="Status"
                    value={ORDER_STATUS_LABELS[order.status] ?? order.status}
                  />
                  <SummaryItem label="Pedido criado em" value={formatOrderDate(orderCreatedAt)} />
                  {order.completed_at && (
                    <SummaryItem label="Concluído em" value={formatOrderDate(order.completed_at)} />
                  )}
                </dl>

                {offer?.mensagem && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Mensagem da proposta
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{offer.mensagem}</p>
                  </div>
                )}

                {order.cancel_reason && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                      Motivo do cancelamento
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{order.cancel_reason}</p>
                  </div>
                )}

                {demand && (
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
                    <Link to={`/supplier/offers/${demand.id}`}>Ver demanda original</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showFooter && (
        <footer className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
          {showCancel && (
            <div className="space-y-2 border-b border-border/60 px-4 py-3 lg:px-6">
              <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  Confirmar cancelamento
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCancel(false)
                    setCancelReason('')
                  }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 px-4 py-3 pb-safe-bottom lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:px-6">
            {actions.map((action) => (
              <Button
                key={action.next}
                className="w-full rounded-xl font-semibold lg:w-auto"
                disabled={updateStatus.isPending}
                onClick={() => handleStatus(action.next)}
              >
                {action.label}
              </Button>
            ))}
            {canCancel && (
              <Button
                variant="outline"
                className="w-full rounded-xl border border-destructive/20 bg-destructive/10 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive lg:w-auto"
                disabled={updateStatus.isPending}
                onClick={() => setShowCancel((open) => !open)}
              >
                {showCancel ? 'Fechar cancelamento' : 'Cancelar pedido'}
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  )
}

function OrderHistoryList({
  logs,
}: {
  logs: Array<{
    id: string
    from_status: string | null
    to_status: string
    created_at: string
    notes: string | null
  }>
  compact?: boolean
}) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
  }

  const timeline = [...logs].reverse()

  return (
    <ol className="relative">
      {timeline.map((log, index) => {
        const isLatest = index === 0
        const isLast = index === timeline.length - 1
        const statusLabel = ORDER_STATUS_LABELS[log.to_status] ?? log.to_status
        const eventDate = new Date(log.created_at)

        return (
          <li key={log.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[11px] top-6 bottom-0 w-0.5',
                  isLatest ? 'bg-primary/30' : 'bg-border',
                )}
              />
            )}

            <span
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                isLatest
                  ? 'border-primary bg-primary shadow-[0_0_0_4px] shadow-primary/15'
                  : 'border-muted-foreground/35 bg-background',
              )}
            >
              {isLatest ? (
                <span className="h-2 w-2 rounded-full bg-primary-foreground" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/35" />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm leading-snug',
                  isLatest ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
                )}
              >
                {statusLabel}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {eventDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
                {' · '}
                {eventDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {log.notes && (
                <p className="mt-2 rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {log.notes}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
