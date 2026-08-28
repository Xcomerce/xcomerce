import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ShoppingBag } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { OrderSupplierPickupInfo } from '@/components/buyer/OrderSupplierPickupInfo'
import { OrderCardTimeline } from '@/components/supplier/OrderCardTimeline'
import { OrderPickupPanel } from '@/components/supplier/OrderPickupPanel'
import { usePageTitle } from '@/hooks/use-page-title'
import { useOrders } from '@/hooks/use-orders'
import { formatCompanyAddress } from '@/lib/address'
import { buildOrderCardTimeline, getPickupTimestamp } from '@/lib/order-display'
import type { BuyerOrderListItem } from '@/services/orders'
import {
  ORDER_ACCEPTED_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_PRODUCTION_STATUSES,
} from '@keve/shared'
import { cn } from '@/lib/utils'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getSupplierDisplayName(order: BuyerOrderListItem): string {
  return (
    order.supplier?.store_name ??
    order.supplier?.profile?.full_name ??
    'Fornecedor'
  )
}

export function BuyerOrdersPage() {
  usePageTitle()
  const { data: orders, isLoading, error } = useOrders('buyer')
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'production' | 'completed'>('all')

  const acceptedStatuses = ORDER_ACCEPTED_STATUSES
  const productionStatuses = ORDER_PRODUCTION_STATUSES
  const completedStatuses = ORDER_COMPLETED_STATUSES
  const buyerOrders = (orders ?? []) as BuyerOrderListItem[]

  const filteredOrders = buyerOrders.filter((order) => {
    if (activeTab === 'accepted') {
      return acceptedStatuses.includes(order.status)
    }
    if (activeTab === 'production') {
      return productionStatuses.includes(order.status)
    }
    if (activeTab === 'completed') {
      return completedStatuses.includes(order.status)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-destructive/50 text-destructive">
          Não foi possível carregar seus pedidos.
        </Alert>
      )}

      {isLoading ? (
        <GridSkeleton count={4} />
      ) : buyerOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum pedido ainda"
          description="Aceite uma proposta para confirmar seu pedido."
          actionLabel="Ver pedidos"
          onAction={() => (window.location.href = '/buyer/dashboard')}
        />
      ) : (
        <div className="space-y-5">
          <div className="sticky top-14 z-20 -mx-4 bg-background/95 pt-3 backdrop-blur-sm md:static md:mx-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
            <div className="flex min-w-0 w-full gap-2 overflow-x-auto scroll-smooth border-b border-border/60 px-4 pt-1.5 pb-3 scroll-px-4 no-scrollbar md:flex-wrap md:overflow-visible md:border-b-0 md:px-0 md:pt-0 md:pb-0 md:scroll-px-0">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "shrink-0 px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
                activeTab === 'all'
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-muted/40"
              )}
            >
              Todos
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'all'
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {buyerOrders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={cn(
                "shrink-0 px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
                activeTab === 'accepted'
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-muted/40"
              )}
            >
              Aceito
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'accepted'
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {buyerOrders.filter(o => acceptedStatuses.includes(o.status)).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={cn(
                "shrink-0 px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
                activeTab === 'production'
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-muted/40"
              )}
            >
              Em produção
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'production'
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {buyerOrders.filter(o => productionStatuses.includes(o.status)).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={cn(
                "shrink-0 px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
                activeTab === 'completed'
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-muted/40"
              )}
            >
              Concluído
              <span className={cn(
                "ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === 'completed'
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {buyerOrders.filter(o => completedStatuses.includes(o.status)).length}
              </span>
            </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-background/50">
              <Package className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhum pedido encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Não há pedidos neste status no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const timeline = buildOrderCardTimeline(order, order.logs ?? [])
                const pickupAt = getPickupTimestamp(order)
                const supplierAddress = formatCompanyAddress(order.supplier?.company ?? null)

                return (
                  <Card key={order.id} className="px-4 py-4 lg:px-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
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
                          {order.offer ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatCurrency(order.offer.valor)}
                              {order.offer.quantidade ? ` (${order.offer.quantidade} un)` : ''}
                            </p>
                          ) : null}
                        </div>

                        <OrderCardTimeline events={timeline} />

                        {order.supplier ? (
                          <OrderSupplierPickupInfo
                            displayName={getSupplierDisplayName(order)}
                            avgRating={order.supplier.avg_rating}
                            totalRatings={order.supplier.total_ratings}
                            address={supplierAddress}
                            phone={order.supplier.profile?.phone ?? null}
                          />
                        ) : null}

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" variant="secondary" className="rounded-xl" asChild>
                            <Link to={`/buyer/orders/${order.id}`}>Ver detalhes</Link>
                          </Button>
                        </div>
                      </div>

                      <OrderPickupPanel
                        pickupAt={pickupAt}
                        prazoEntregaDias={order.offer?.prazo_entrega_dias}
                        orderStatus={order.status}
                        overdueLabel="Deveria estar pronto"
                        className="w-full shrink-0 md:w-44"
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
