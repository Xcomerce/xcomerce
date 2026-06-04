import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrders } from '@/hooks/use-orders'

export function SupplierOrdersPage() {
  const { data: orders = [], isLoading, isError } = useOrders('supplier')

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

      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          icon={Package}
          title="Nenhum pedido"
          description="Quando um comprador aceitar sua proposta, o pedido aparecerá aqui."
        />
      )}

      <div className="space-y-3">
        {orders.map((order) => (
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
    </div>
  )
}
