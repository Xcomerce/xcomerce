import { BarChart3, CreditCard, FileText, Send, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { useAdminMetrics } from '@/hooks/use-admin'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

type KpiCardProps = {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
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

export function MetricsPage() {
  const { data: metrics, isLoading, isError } = useAdminMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Métricas</h1>
        <p className="text-sm text-muted-foreground">KPIs da plataforma Keve B2B</p>
      </div>

      {isLoading && <GridSkeleton count={6} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar as métricas.</p>
      )}

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Usuários" value={metrics.totalUsers} icon={Users} />
          <KpiCard title="Compradores" value={metrics.totalBuyers} icon={Users} />
          <KpiCard title="Fornecedores" value={metrics.totalSuppliers} icon={Users} />
          <KpiCard
            title="Aprovações pendentes"
            value={metrics.pendingApprovals}
            icon={BarChart3}
            description="Em revisão ou pendente"
          />
          <KpiCard title="Demandas publicadas" value={metrics.publishedDemands} icon={FileText} />
          <KpiCard title="Propostas enviadas" value={metrics.offersSent} icon={Send} />
          <KpiCard
            title="Assinaturas ativas"
            value={metrics.activeSubscriptions}
            icon={CreditCard}
          />
          <KpiCard title="MRR" value={formatCurrency(metrics.mrr)} icon={CreditCard} description="Receita recorrente mensal" />
        </div>
      )}
    </div>
  )
}
