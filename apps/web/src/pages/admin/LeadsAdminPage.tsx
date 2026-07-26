import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  LayoutList,
  Mail,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  CRM_STATUS_LABELS,
  CRM_STATUSES,
  type CrmLead,
  type CrmLeadStatus,
} from '@/services/crm'
import { useLeadMetrics, useLeads, useSendLeadInvite, useUpdateLead } from '@/hooks/use-crm'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function statusClass(status: CrmLeadStatus) {
  switch (status) {
    case 'novo':
      return 'border-sky-200 bg-sky-50 text-sky-800'
    case 'contatado':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'qualificado':
      return 'border-violet-200 bg-violet-50 text-violet-800'
    case 'convertido':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'descartado':
      return 'border-border bg-muted text-muted-foreground'
  }
}

function Kpi({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function LeadsAdminPage() {
  const [view, setView] = useState<'table' | 'funnel'>('table')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CrmLeadStatus | ''>('')
  const [profileType, setProfileType] = useState<'buyer' | 'supplier' | ''>('')

  const filters = useMemo(
    () => ({ search, status, profile_type: profileType, page, pageSize: PAGE_SIZE }),
    [search, status, profileType, page],
  )

  const metricsQ = useLeadMetrics()
  const leadsQ = useLeads(filters)
  const updateLead = useUpdateLead()
  const invite = useSendLeadInvite()

  const total = leadsQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const metrics = metricsQ.data

  async function changeStatus(lead: CrmLead, next: CrmLeadStatus) {
    try {
      await updateLead.mutateAsync({ id: lead.id, patch: { status: next } })
      toast.success('Status atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleInvite(lead: CrmLead) {
    try {
      const result = await invite.mutateAsync(lead.id)
      if (result?.invite_url) {
        await navigator.clipboard.writeText(result.invite_url)
        toast.success('Convite enviado e link copiado')
      } else {
        toast.success('Convite enviado')
      }
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao convidar'))
    }
  }

  const funnelGroups = useMemo(() => {
    const all = leadsQ.data?.data ?? []
    // For funnel view, fetch without pagination would be better — show current page grouped as MVP
    // Prefer metrics counts for columns and list current page items by status
    return CRM_STATUSES.map((s) => ({
      status: s,
      count: metrics ? metrics[s] : 0,
      items: all.filter((l) => l.status === s),
    }))
  }, [leadsQ.data?.data, metrics])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <div className="relative z-10 shrink-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar nome ou e-mail"
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
              />
            </div>
            <select
              className="h-10 w-44 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value as CrmLeadStatus | '')
              }}
              aria-label="Status"
            >
              <option value="">Todos os status</option>
              {CRM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CRM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
              value={profileType}
              onChange={(e) => {
                setPage(1)
                setProfileType(e.target.value as 'buyer' | 'supplier' | '')
              }}
              aria-label="Tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="buyer">Comprador</option>
              <option value="supplier">Fornecedor</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              title="Atualizar"
              onClick={() => {
                leadsQ.refetch()
                metricsQ.refetch()
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="flex rounded-md border">
              <Button
                variant={view === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setView('table')}
                title="Tabela"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'funnel' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setView('funnel')}
                title="Funil"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi title="Novos" value={metrics?.novo ?? '—'} />
          <Kpi title="Contatados" value={metrics?.contatado ?? '—'} />
          <Kpi title="Convertidos" value={metrics?.convertido ?? '—'} />
          <Kpi
            title="Taxa conversão"
            value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : '—'}
          />
          <Kpi title="Leads 7d" value={metrics?.last7d ?? '—'} hint={`Total: ${metrics?.total ?? 0}`} />
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        {leadsQ.isLoading ? (
          <div className="space-y-2 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !leadsQ.data?.data.length ? (
          <div className="overflow-y-auto">
            <EmptyState
              icon={Users}
              title="Nenhum lead encontrado"
              description="Ajuste os filtros ou aguarde novas capturas da landing."
            />
          </div>
        ) : view === 'funnel' ? (
          <div className="scrollbar-custom flex min-h-0 flex-1 gap-3 overflow-x-auto overscroll-contain pb-3">
            {funnelGroups.map((col) => (
              <div
                key={col.status}
                className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/30"
              >
                <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                  <span className="text-sm font-medium">{CRM_STATUS_LABELS[col.status]}</span>
                  <Badge className={statusClass(col.status)}>{col.count}</Badge>
                </div>
                <div className="scrollbar-custom flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {col.items.map((lead) => (
                    <div key={lead.id} className="rounded-md border bg-background p-3 shadow-sm">
                      <p className="truncate text-sm font-medium">{lead.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <select
                          className="h-8 w-full rounded border bg-background px-2 text-xs"
                          value={lead.status}
                          onChange={(e) => changeStatus(lead, e.target.value as CrmLeadStatus)}
                        >
                          {CRM_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {CRM_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs">
                          <Link to={`/admin/leads/${lead.id}`}>Ver</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={invite.isPending || lead.email_opt_out}
                          onClick={() => handleInvite(lead)}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!col.items.length ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Vazio nesta página
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
            <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 z-10 border-b bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-medium">Lead</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Origem</th>
                    <th className="px-3 py-3 font-medium">Criado</th>
                    <th className="px-3 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsQ.data.data.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        {lead.profile_type === 'supplier'
                          ? 'Fornecedor'
                          : lead.profile_type === 'buyer'
                            ? 'Comprador'
                            : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className={cn(
                            'h-8 rounded-full border px-2 text-xs font-semibold',
                            statusClass(lead.status),
                          )}
                          value={lead.status}
                          onChange={(e) => changeStatus(lead, e.target.value as CrmLeadStatus)}
                        >
                          {CRM_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {CRM_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{lead.source}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(lead.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/admin/leads/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={invite.isPending || lead.email_opt_out}
                            onClick={() => handleInvite(lead)}
                            title="Convidar"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background pt-3">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
