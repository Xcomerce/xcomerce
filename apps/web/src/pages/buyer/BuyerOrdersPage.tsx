import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useOrders } from '@/hooks/use-orders'
import { ORDER_STATUS_LABELS } from '@keve/shared'

export function BuyerOrdersPage() {
  usePageTitle()
  const { data: orders, isLoading, error } = useOrders('buyer')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Meus pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o workflow pós-aceite de propostas.
        </p>
      </div>

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
        <div className="space-y-3">
          {(orders ?? []).map((order) => (
            <Link key={order.id} to={`/buyer/orders/${order.id}`}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">
                    Pedido #{order.id.slice(0, 8).toUpperCase()}
                  </CardTitle>
                  <StatusBadge status={order.status} kind="order" />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                  {order.completed_at && (
                    <p className="text-xs">
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
  )
}
