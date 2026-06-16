import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, CreditCard, Download, FileText, Minus, Send, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { useAdminMetrics } from '@/hooks/use-admin'
import { useAuth } from '@/contexts/auth-context'
import type { AdminMetricsDashboard, MetricTrend, MetricsPeriod } from '@/services/admin'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
const PERIOD_OPTIONS: { value: MetricsPeriod; label: string }[] = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

const CHART_COLORS = {
  users: 'hsl(221 94% 59%)',
  demands: 'hsl(142 71% 45%)',
  offers: 'hsl(262 83% 58%)',
  orders: 'hsl(32 95% 44%)',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

type KpiCardProps = {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description?: string
  trend?: MetricTrend
  trendHint?: string
}

function formatTrendPercent(value: number) {
  const abs = Math.abs(value)
  if (abs >= 100) return `${abs.toFixed(0)}%`
  if (abs >= 10) return `${abs.toFixed(0)}%`
  return `${abs.toFixed(1)}%`
}

function TrendBadge({ trend, hint }: { trend: MetricTrend; hint: string }) {
  if (trend.direction === 'flat') {
    return (
      <div
        className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
        title={hint}
      >
        <Minus className="h-3.5 w-3.5" />
        <span>0%</span>
      </div>
    )
  }

  const isUp = trend.direction === 'up'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
        isUp
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive',
      )}
      title={hint}
    >
      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      <span>{formatTrendPercent(trend.changePercent)}</span>
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, description, trend, trendHint }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {(description || (trend && trendHint)) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : (
              <span />
            )}
            {trend && trendHint && <TrendBadge trend={trend} hint={trendHint} />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatTrendForCsv(trend: MetricTrend): string {
  if (trend.direction === 'flat') return '0%'
  const sign = trend.direction === 'up' ? '+' : '-'
  return `${sign}${formatTrendPercent(trend.changePercent)}`
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function exportMetricsCsv(metrics: AdminMetricsDashboard, periodLabel: string) {
  const exportedAt = new Date().toLocaleString('pt-BR')
  const rows: (string | number)[][] = [
    ['Relatório de Métricas'],
    ['Período', periodLabel],
    ['Exportado em', exportedAt],
    [],
    ['Indicador', 'Valor', 'Variação vs período anterior'],
    ['Novos usuários', metrics.periodCounts.newUsers, formatTrendForCsv(metrics.trends.newUsers)],
    ['Novos compradores', metrics.periodCounts.newBuyers, formatTrendForCsv(metrics.trends.newBuyers)],
    ['Novos fornecedores', metrics.periodCounts.newSuppliers, formatTrendForCsv(metrics.trends.newSuppliers)],
    ['Aprovações pendentes', metrics.pendingApprovals, formatTrendForCsv(metrics.trends.newPendingApprovals)],
    ['Demandas publicadas', metrics.periodCounts.newDemands, formatTrendForCsv(metrics.trends.newDemands)],
    ['Propostas enviadas', metrics.periodCounts.newOffers, formatTrendForCsv(metrics.trends.newOffers)],
    ['Assinaturas ativas', metrics.activeSubscriptions, formatTrendForCsv(metrics.trends.activeSubscriptions)],
    ['MRR', metrics.mrr.toFixed(2), formatTrendForCsv(metrics.trends.mrr)],
    [],
    ['Evolução diária'],
    ['Data', 'Usuários', 'Demandas', 'Propostas', 'Pedidos'],
    ...metrics.daily.map((day) => [day.label, day.users, day.demands, day.offers, day.orders]),
  ]

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `metricas-${metrics.period}d-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ChartTooltip({  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export function MetricsPage() {
  const [period, setPeriod] = useState<MetricsPeriod>(30)
  const { profile } = useAuth()
  const { data: metrics, isLoading, isError } = useAdminMetrics(period)

  const periodLabel = `Últimos ${period} dias`
  const trendHint = `Comparado aos ${period} dias anteriores`
  const firstName = profile?.full_name ? getFirstName(profile.full_name) : null
  const greeting = firstName ? `${getGreeting()}, ${firstName}` : getGreeting()

  function handleExport() {
    if (!metrics) return
    exportMetricsCsv(metrics, periodLabel)
    toast.success('Relatório exportado')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{greeting}</p>
          <p className="text-sm text-muted-foreground">
            Visão geral da plataforma no período selecionado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? 'default' : 'outline'}
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={!metrics || isLoading}
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      {isLoading && <GridSkeleton count={6} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar as métricas.</p>
      )}

      {metrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Novos usuários"
              value={metrics.periodCounts.newUsers}
              icon={Users}
              description={periodLabel}
              trend={metrics.trends.newUsers}
              trendHint={trendHint}
            />
            <KpiCard
              title="Novos compradores"
              value={metrics.periodCounts.newBuyers}
              icon={Users}
              description={periodLabel}
              trend={metrics.trends.newBuyers}
              trendHint={trendHint}
            />
            <KpiCard
              title="Novos fornecedores"
              value={metrics.periodCounts.newSuppliers}
              icon={Users}
              description={periodLabel}
              trend={metrics.trends.newSuppliers}
              trendHint={trendHint}
            />
            <KpiCard
              title="Aprovações pendentes"
              value={metrics.pendingApprovals}
              icon={BarChart3}
              description="Situação atual"
              trend={metrics.trends.newPendingApprovals}
              trendHint="Movimentações na fila vs período anterior"
            />
            <KpiCard
              title="Demandas publicadas"
              value={metrics.periodCounts.newDemands}
              icon={FileText}
              description={periodLabel}
              trend={metrics.trends.newDemands}
              trendHint={trendHint}
            />
            <KpiCard
              title="Propostas enviadas"
              value={metrics.periodCounts.newOffers}
              icon={Send}
              description={periodLabel}
              trend={metrics.trends.newOffers}
              trendHint={trendHint}
            />
            <KpiCard
              title="Assinaturas ativas"
              value={metrics.activeSubscriptions}
              icon={CreditCard}
              description="Situação atual"
              trend={metrics.trends.activeSubscriptions}
              trendHint="Novas assinaturas vs período anterior"
            />
            <KpiCard
              title="MRR"
              value={formatCurrency(metrics.mrr)}
              icon={CreditCard}
              description="Receita recorrente mensal"
              trend={metrics.trends.mrr}
              trendHint="MRR de novas assinaturas vs período anterior"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atividade da plataforma</CardTitle>
                <CardDescription>Evolução diária no período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        interval={period === 7 ? 0 : period === 30 ? 4 : 13}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="users"
                        name="Usuários"
                        stroke={CHART_COLORS.users}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="demands"
                        name="Demandas"
                        stroke={CHART_COLORS.demands}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="offers"
                        name="Propostas"
                        stroke={CHART_COLORS.offers}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        name="Pedidos"
                        stroke={CHART_COLORS.orders}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume por dia</CardTitle>
                <CardDescription>Comparativo em barras empilhadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={period === 7 ? 0 : period === 30 ? 4 : 13}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey="demands" name="Demandas" stackId="a" fill={CHART_COLORS.demands} />
                      <Bar dataKey="offers" name="Propostas" stackId="a" fill={CHART_COLORS.offers} />
                      <Bar dataKey="orders" name="Pedidos" stackId="a" fill={CHART_COLORS.orders} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
