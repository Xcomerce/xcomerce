import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Package, Phone, Printer, User } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrders, useUpdateOrderStatus } from '@/hooks/use-orders'
import {
  ORDER_ACCEPTED_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_PRODUCTION_STATUSES,
  ORDER_STATUS_LABELS,
  canSupplierConfirmPayment,
} from '@keve/shared'
import type { SupplierOrderListItem } from '@/services/orders'
import { printOrderDocument } from '@/lib/order-print'
import { translateSupabaseError } from '@/lib/errors'
import { cn, formatPhone } from '@/lib/utils'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function SupplierOrdersPage() {
  const { data: orders = [], isLoading, isError } = useOrders('supplier')
  const updateStatus = useUpdateOrderStatus()
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'production' | 'completed'>('all')

  const supplierOrders = orders as SupplierOrderListItem[]

  const filteredOrders = supplierOrders.filter((order) => {
    if (activeTab === 'accepted') return ORDER_ACCEPTED_STATUSES.includes(order.status)
    if (activeTab === 'production') return ORDER_PRODUCTION_STATUSES.includes(order.status)
    if (activeTab === 'completed') return ORDER_COMPLETED_STATUSES.includes(order.status)
    return true
  })

  async function handleConfirmPayment(order: SupplierOrderListItem) {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'PAGAMENTO_CONFIRMADO' })
      toast.success('Pagamento confirmado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao confirmar'))
    }
  }

  function handlePrint(order: SupplierOrderListItem) {
    const ok = printOrderDocument({
      order,
      demand: order.demand,
      offer: order.offer,
      buyer: order.buyer,
    })
    if (!ok) {
      toast.error('Não foi possível abrir a impressão. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      {isLoading && <GridSkeleton count={3} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os pedidos.</p>
      )}

      {!isLoading && !isError && supplierOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum pedido"
          description="Quando um comprador aceitar sua proposta, o pedido aparecerá aqui."
        />
      ) : !isLoading && !isError && (
        <div className="space-y-5">
          <OrderTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            counts={{
              all: supplierOrders.length,
              accepted: supplierOrders.filter((o) => ORDER_ACCEPTED_STATUSES.includes(o.status)).length,
              production: supplierOrders.filter((o) => ORDER_PRODUCTION_STATUSES.includes(o.status)).length,
              completed: supplierOrders.filter((o) => ORDER_COMPLETED_STATUSES.includes(o.status)).length,
            }}
          />

          {filteredOrders.length === 0 ? (
            <EmptyTabState />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="px-4 py-4 lg:px-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-transparent px-2.5 font-mono text-xs font-semibold leading-none tracking-wider text-foreground">
                        Pedido#{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <StatusBadge status={order.status} kind="order" className="h-6 shrink-0 py-0 text-xs" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground line-clamp-2">
                        {order.demand?.titulo ?? `Pedido ${order.demand_id.slice(0, 8)}…`}
                      </p>
                      {order.demand ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.demand.cidade}/{order.demand.uf}
                          {order.offer ? ` · ${formatCurrency(order.offer.valor)}` : ''}
                        </p>
                      ) : null}
                    </div>

                    {order.buyer ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {order.buyer.full_name}
                        </span>
                        {order.buyer.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {formatPhone(order.buyer.phone)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {canSupplierConfirmPayment(order.status) ? (
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={updateStatus.isPending}
                          onClick={() => void handleConfirmPayment(order)}
                        >
                          Confirmar pagamento
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handlePrint(order)}
                      >
                        <Printer className="mr-1.5 h-4 w-4" />
                        Imprimir pedido
                      </Button>
                      <Button size="sm" variant="secondary" className="rounded-xl" asChild>
                        <Link to={`/supplier/orders/${order.id}`}>Ver detalhes</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderTabs({
  activeTab,
  onChange,
  counts,
}: {
  activeTab: 'all' | 'accepted' | 'production' | 'completed'
  onChange: (tab: 'all' | 'accepted' | 'production' | 'completed') => void
  counts: Record<'all' | 'accepted' | 'production' | 'completed', number>
}) {
  const tabs = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'accepted' as const, label: 'Aceito' },
    { id: 'production' as const, label: 'Em produção' },
    { id: 'completed' as const, label: 'Concluído' },
  ]

  return (
    <div className="sticky top-14 z-20 -mx-4 bg-background/95 pt-3 backdrop-blur-sm md:static md:mx-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
      <div className="flex min-w-0 w-full gap-2 overflow-x-auto scroll-smooth border-b border-border/60 px-4 pt-1.5 pb-3 scroll-px-4 no-scrollbar md:flex-wrap md:overflow-visible md:border-b-0 md:px-0 md:pt-0 md:pb-0 md:scroll-px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'shrink-0 px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                : 'bg-background text-foreground border-border hover:bg-muted/40',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold',
                activeTab === tab.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyTabState() {
  return (
    <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-background/50">
      <Package className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm font-semibold text-muted-foreground">Nenhum pedido encontrado</p>
      <p className="text-xs text-muted-foreground/60 mt-0.5">
        Não há pedidos neste status no momento.
      </p>
    </div>
  )
}
