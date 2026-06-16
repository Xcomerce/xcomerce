import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Package,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { useFinancialReports } from '@/hooks/use-admin'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Ativas',
  trialing: 'Em trial',
  past_due: 'Inadimplentes',
  canceled: 'Canceladas',
}

type KpiCardProps = {
  title: string
  value: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
}

function KpiCard({ title, value, description, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

export function FinancialReportsPage() {
  const { data: reports, isLoading, isError } = useFinancialReports()

  return (
    <div className="space-y-8">
      {isLoading && <GridSkeleton count={6} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar os relatórios.</p>
      )}

      {reports && (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Receita da plataforma</h2>
              <p className="text-sm text-muted-foreground">
                Assinaturas mensais — cobrança via Asaas, sem comissão sobre pedidos
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="MRR"
                value={formatCurrency(reports.mrr)}
                description="Assinaturas ativas"
                icon={CreditCard}
              />
              <KpiCard
                title="ARR"
                value={formatCurrency(reports.arr)}
                description="Projeção anual (MRR × 12)"
                icon={TrendingUp}
              />
              <KpiCard
                title="Assinaturas"
                value={String(reports.totalSubscriptions)}
                description="Total cadastradas"
                icon={BarChart3}
              />
              <KpiCard
                title="Em trial"
                value={String(reports.subscriptionsByStatus.trialing ?? 0)}
                icon={ArrowLeftRight}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Assinaturas por status</CardTitle>
                  <CardDescription>Distribuição atual das assinaturas cadastradas</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {reports.totalSubscriptions === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p>
                  ) : (
                    Object.keys(SUBSCRIPTION_STATUS_LABELS).map((status) => {
                      const count = reports.subscriptionsByStatus[status] ?? 0
                      return (
                        <div
                          key={status}
                          className="flex min-h-12 flex-1 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <span>{SUBSCRIPTION_STATUS_LABELS[status]}</span>
                          <Badge className="bg-secondary text-secondary-foreground">{count}</Badge>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Receita por plano</CardTitle>
                  <CardDescription>Contagem e MRR por plano ativo</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {reports.planBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
                  ) : (
                    reports.planBreakdown.map((row) => (
                      <div
                        key={row.planId}
                        className="flex min-h-12 flex-1 items-center rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span className="font-medium">{row.planName}</span>
                            <span className="text-muted-foreground">
                              {row.activeCount} ativa(s) · {row.trialingCount} em trial ·{' '}
                              {formatCurrency(row.planPrice)}/mês
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-semibold">
                            {formatCurrency(row.mrrContribution)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Marketplace (operacional)</h2>
              <p className="text-sm text-muted-foreground">
                Volume de negócios entre compradores e fornecedores — não entra na receita da plataforma
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="GMV — propostas aceitas"
                value={formatCurrency(reports.gmvAcceptedOffers)}
                description={`${reports.acceptedOffersCount} proposta(s)`}
                icon={ArrowLeftRight}
              />
              <KpiCard
                title="GMV — pedidos concluídos"
                value={formatCurrency(reports.gmvCompletedOrders)}
                description={`${reports.completedOrdersCount} pedido(s)`}
                icon={Package}
              />
              <KpiCard
                title="Ticket médio"
                value={formatCurrency(reports.avgCompletedOrderValue)}
                description="Pedidos entregues/concluídos"
                icon={TrendingUp}
              />
              <KpiCard
                title="Total de pedidos"
                value={String(reports.totalOrders)}
                icon={BarChart3}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
