import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Receipt,
  Search,
  CreditCard,
  Clock,
  AlertTriangle,
  Ban,
  Users,
  CircleX,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useAdminPlans,
  useAdminSubscriptions,
  useUpdateAdminSubscription,
} from '@/hooks/use-admin'
import type { AdminSubscription, SubscriptionStatus } from '@/services/admin'
import { ROLE_LABELS } from '@/config/navigation'
import { translateSupabaseError } from '@/lib/errors'

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  trialing: 'Em trial',
  past_due: 'Inadimplente',
  canceled: 'Cancelada',
}

const STATUS_BADGE_CLASS: Record<SubscriptionStatus, string> = {
  active: 'bg-primary text-primary-foreground',
  trialing: 'bg-secondary text-secondary-foreground',
  past_due: 'border border-destructive/50 bg-destructive/10 text-destructive',
  canceled: 'border border-border bg-transparent text-muted-foreground',
}

const STATUS_ICONS: Record<SubscriptionStatus, React.ComponentType<{ className?: string }>> = {
  active: CreditCard,
  trialing: Clock,
  past_due: AlertTriangle,
  canceled: Ban,
}

const PAGE_SIZE = 10

function SubscriptionsTableColGroup() {
  return (
    <colgroup>
      <col className="w-[36%]" />
      <col className="w-[22%]" />
      <col className="w-[12%]" />
      <col className="w-[18%]" />
      <col className="w-[12%]" />
    </colgroup>
  )
}

function SubscriptionsTableHead() {
  return (
    <thead>
      <tr>
        <th className="px-3 py-3 text-left font-medium">Usuário</th>
        <th className="px-3 py-3 text-left font-medium">Plano</th>
        <th className="px-3 py-3 text-left font-medium">Status</th>
        <th className="px-3 py-3 text-left font-medium">Detalhes</th>
        <th className="px-3 py-3 text-right font-medium">Ações</th>
      </tr>
    </thead>
  )
}

function SubscriptionsPaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background pt-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

type SubscriptionTableRowProps = {
  subscription: AdminSubscription
  plans: { id: string; name: string; code: string }[]
  onUpdate: ReturnType<typeof useUpdateAdminSubscription>
}

function SubscriptionTableRow({ subscription, plans, onUpdate }: SubscriptionTableRowProps) {
  const [planId, setPlanId] = useState(subscription.plan_id)
  const planChanged = planId !== subscription.plan_id

  const role = subscription.profiles?.primary_role
  const roleLabel =
    role && role in ROLE_LABELS ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : role

  async function handlePlanSave() {
    try {
      await onUpdate.mutateAsync({
        id: subscription.id,
        input: { plan_id: planId },
        metadata: {
          user_id: subscription.user_id,
          previous_plan_id: subscription.plan_id,
        },
      })
      toast.success('Plano atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleStatusChange(status: SubscriptionStatus) {
    if (status === subscription.status) return
    const confirmMsg =
      status === 'canceled'
        ? 'Cancelar esta assinatura manualmente?'
        : `Alterar status para "${STATUS_LABELS[status]}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      await onUpdate.mutateAsync({
        id: subscription.id,
        input: { status },
        metadata: {
          user_id: subscription.user_id,
          previous_status: subscription.status,
        },
      })
      toast.success('Status atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  const hasPeriod =
    subscription.current_period_start != null || subscription.current_period_end != null

  const hasExtraDetails =
    subscription.trial_ends_at != null ||
    hasPeriod ||
    subscription.asaas_subscription_id != null

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{subscription.profiles?.full_name ?? 'Sem nome'}</span>
          {roleLabel && (
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          )}
        </div>
        <p className="break-all text-xs text-muted-foreground">
          {subscription.profiles?.email ?? '—'}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(subscription.updated_at)}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <div className="flex items-center gap-1.5">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="h-8 w-[88px] rounded-md border border-border bg-background px-2 text-xs"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          {subscription.plan && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(subscription.plan.price)}/mês
            </span>
          )}
          {planChanged && (
            <Button
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              disabled={onUpdate.isPending}
              onClick={handlePlanSave}
            >
              Ok
            </Button>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <Badge className={STATUS_BADGE_CLASS[subscription.status]}>
          {STATUS_LABELS[subscription.status]}
        </Badge>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {hasExtraDetails ? (
          <div className="space-y-0.5">
            {subscription.trial_ends_at && <p>Trial: {formatDate(subscription.trial_ends_at)}</p>}
            {hasPeriod && (
              <p className="break-words">
                {formatDate(subscription.current_period_start)} —{' '}
                {formatDate(subscription.current_period_end)}
              </p>
            )}
            {subscription.asaas_subscription_id && (
              <p className="truncate font-mono" title={subscription.asaas_subscription_id}>
                Asaas: {subscription.asaas_subscription_id}
              </p>
            )}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {subscription.status !== 'active' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={onUpdate.isPending}
              onClick={() => handleStatusChange('active')}
            >
              Reativar
            </Button>
          )}
          {subscription.status !== 'canceled' && (
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Cancelar assinatura"
              disabled={onUpdate.isPending}
              onClick={() => handleStatusChange('canceled')}
            >
              <CircleX className="h-4 w-4" />
            </Button>
          )}
          {subscription.status === 'active' && (
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              title="Marcar inadimplente"
              disabled={onUpdate.isPending}
              onClick={() => handleStatusChange('past_due')}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function SubscriptionsAdminPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SubscriptionStatus | ''>('')
  const [planId, setPlanId] = useState('')
  const [page, setPage] = useState(1)

  const { data: plans = [] } = useAdminPlans()
  const { data: allSubscriptions = [], isLoading, refetch } = useAdminSubscriptions()
  const updateSubscription = useUpdateAdminSubscription()

  const filteredSubscriptions = useMemo(() => {
    let rows = allSubscriptions

    if (status) {
      rows = rows.filter((sub) => sub.status === status)
    }

    if (planId) {
      rows = rows.filter((sub) => sub.plan_id === planId)
    }

    const query = search.trim().toLowerCase()
    if (query) {
      rows = rows.filter((sub) => {
        const email = sub.profiles?.email?.toLowerCase() ?? ''
        const name = sub.profiles?.full_name?.toLowerCase() ?? ''
        return email.includes(query) || name.includes(query)
      })
    }

    return rows
  }, [allSubscriptions, status, planId, search])

  const total = filteredSubscriptions.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const paginatedSubscriptions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredSubscriptions.slice(start, start + PAGE_SIZE)
  }, [filteredSubscriptions, page])

  useEffect(() => {
    setPage(1)
  }, [search, status, planId])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const sub of filteredSubscriptions) {
      counts[sub.status] = (counts[sub.status] ?? 0) + 1
    }
    return counts
  }, [filteredSubscriptions])

  const hasActiveFilters = Boolean(search.trim() || status || planId)

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPlanId('')
    setPage(1)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <div className="relative z-10 shrink-0 space-y-4">
        {!isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total" value={filteredSubscriptions.length} icon={Users} />
            {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((key) => (
              <StatCard
                key={key}
                title={STATUS_LABELS[key]}
                value={stats[key] ?? 0}
                icon={STATUS_ICONS[key]}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nome ou e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus | '')}
              className="h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
              aria-label="Status"
            >
              <option value="">Todos</option>
              {(Object.keys(STATUS_LABELS) as SubscriptionStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          <select
              id="plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="h-10 w-44 rounded-md border border-border bg-background px-3 text-sm"
              aria-label="Plano"
            >
              <option value="">Todos</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          <Button variant="outline" onClick={clearFilters}>
            Limpar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            title="Atualizar"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading && (
          <div className="space-y-2 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!isLoading && filteredSubscriptions.length === 0 && (
          <div className="overflow-y-auto">
            <EmptyState
              icon={Receipt}
              title={hasActiveFilters ? 'Nenhum resultado' : 'Nenhuma assinatura'}
              description={
                hasActiveFilters
                  ? 'Ajuste os filtros para encontrar assinaturas.'
                  : 'Aguarde novos cadastros na plataforma.'
              }
            />
          </div>
        )}

        {!isLoading && filteredSubscriptions.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
            <div className="shrink-0 border-b bg-muted [scrollbar-gutter:stable]">
              <table className="w-full table-fixed text-sm">
                <SubscriptionsTableColGroup />
                <SubscriptionsTableHead />
              </table>
            </div>
            <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 [scrollbar-gutter:stable]">
              <table className="w-full table-fixed text-sm">
                <SubscriptionsTableColGroup />
                <tbody>
                  {paginatedSubscriptions.map((subscription) => (
                    <SubscriptionTableRow
                      key={subscription.id}
                      subscription={subscription}
                      plans={plans}
                      onUpdate={updateSubscription}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!isLoading && total > 0 && (
        <SubscriptionsPaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
