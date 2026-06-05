import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
          {/* Abas de Filtros */}
          <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
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
                "px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
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
                "px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
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
                "px-4 h-9 flex items-center justify-center text-sm font-semibold rounded-full transition-all whitespace-nowrap border",
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

          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-2xl bg-background/50">
              <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhum pedido encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Não há pedidos neste status no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <Link key={order.id} to={`/buyer/orders/${order.id}`}>
                  <Card className="transition-colors hover:border-primary/40 hover:bg-muted/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-xs font-medium text-foreground tracking-wider bg-transparent">
                        ID#{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <StatusBadge status={order.status} kind="order" />
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                      {order.completed_at && (
                        <p className="text-xs mt-1">
                          Concluído em {new Date(order.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
