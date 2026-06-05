import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrders } from '@/hooks/use-orders'
import { cn } from '@/lib/utils'

export function SupplierOrdersPage() {
  const { data: orders = [], isLoading, isError } = useOrders('supplier')
  const [activeTab, setActiveTab] = useState<'all' | 'accepted' | 'production' | 'completed'>('all')

  const acceptedStatuses = ['PROPOSTA_ACEITA', 'AGUARDANDO_CONFIRMACAO_EXTERNA']
  const productionStatuses = ['PAGAMENTO_INFORMADO', 'ENVIO_INFORMADO', 'ENTREGUE']
  const completedStatuses = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO']

  const filteredOrders = orders.filter((order) => {
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
      <div>
        <h1 className="font-display text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe pedidos após aceite das suas propostas
        </p>
      </div>

      {isLoading && <GridSkeleton count={3} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os pedidos.</p>
      )}

      {!isLoading && !isError && orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum pedido"
          description="Quando um comprador aceitar sua proposta, o pedido aparecerá aqui."
        />
      ) : !isLoading && !isError && (
        <div className="space-y-5">
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
                {orders.length}
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
                {orders.filter(o => acceptedStatuses.includes(o.status)).length}
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
                {orders.filter(o => productionStatuses.includes(o.status)).length}
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
                {orders.filter(o => completedStatuses.includes(o.status)).length}
              </span>
            </button>
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
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-xs font-medium text-foreground tracking-wider bg-transparent">
                      ID#{order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <StatusBadge status={order.status} kind="order" />
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Demanda {order.demand_id.slice(0, 8)}…
                    </p>
                    <Button size="sm" variant="secondary" asChild>
                      <Link to={`/supplier/orders/${order.id}`}>Ver detalhes</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
