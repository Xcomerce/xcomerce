import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Package, ShoppingBag } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useOrders } from '@/hooks/use-orders'
import { ORDER_STATUS_LABELS } from '@keve/shared'
import { cn } from '@/lib/utils'

export function BuyerOrdersPage() {
  usePageTitle()
  const { data: orders, isLoading, error } = useOrders('buyer')
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'production' | 'completed'>('all')

  const acceptedStatuses = ['PROPOSTA_ACEITA', 'AGUARDANDO_CONFIRMACAO_EXTERNA']
  const productionStatuses = ['PAGAMENTO_INFORMADO', 'ENVIO_INFORMADO', 'ENTREGUE']
  const completedStatuses = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO']

  const filteredOrders = (orders ?? []).filter((order) => {
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
      ) : (orders ?? []).length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum pedido ainda"
          description="Aceite uma proposta em uma demanda para iniciar um pedido."
          actionLabel="Ver demandas"
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
                {(orders ?? []).length}
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
                {(orders ?? []).filter(o => acceptedStatuses.includes(o.status)).length}
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
                {(orders ?? []).filter(o => productionStatuses.includes(o.status)).length}
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
                {(orders ?? []).filter(o => completedStatuses.includes(o.status)).length}
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
              {filteredOrders.map((order) => (
                <Card key={order.id} className="px-4 py-4 lg:px-5">
                  <div className="flex items-center justify-between gap-3 lg:hidden">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-nowrap items-center gap-2">
                        <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-transparent px-2 font-mono text-[10px] font-semibold leading-none tracking-wider text-foreground sm:px-2.5 sm:text-xs">
                          ID#{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <StatusBadge
                          status={order.status}
                          kind="order"
                          className="h-6 shrink-0 whitespace-nowrap py-0 text-[10px] leading-none sm:text-xs"
                        />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </p>
                      {order.completed_at && (
                        <p className="text-xs text-muted-foreground/80">
                          Concluído em {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button size="icon" variant="secondary" className="h-9 w-9 shrink-0" asChild>
                      <Link to={`/buyer/orders/${order.id}`} aria-label="Ver detalhes">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="hidden items-center justify-between gap-4 lg:flex">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex h-6 shrink-0 items-center rounded-full border border-border bg-transparent px-2.5 font-mono text-xs font-semibold leading-none tracking-wider text-foreground">
                          ID#{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <StatusBadge
                          status={order.status}
                          kind="order"
                          className="h-6 shrink-0 items-center py-0 leading-none"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </p>
                      {order.completed_at && (
                        <p className="text-xs text-muted-foreground/80">
                          Concluído em {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="secondary" className="shrink-0" asChild>
                      <Link to={`/buyer/orders/${order.id}`}>Ver detalhes</Link>
                    </Button>
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
