import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { DEMAND_STATUS_LABELS } from '@keve/shared'
import { Alert } from '@/components/ui/alert'
import { formatSupabaseError } from '@/lib/errors'
import { getSupabaseProjectLabel, isSupabaseConfigured } from '@/lib/supabase'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDemands } from '@/hooks/use-demands'
import type { Demand, DemandStatus } from '@/services/demands'
import { cn } from '@/lib/utils'

type KanbanColumn = {
  id: string
  label: string
  statuses: DemandStatus[]
  headerClass: string
  dotClass: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'rascunho',
    label: DEMAND_STATUS_LABELS.RASCUNHO,
    statuses: ['RASCUNHO'],
    headerClass: 'bg-muted/60 text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
  {
    id: 'publicada',
    label: DEMAND_STATUS_LABELS.PUBLICADA,
    statuses: ['PUBLICADA'],
    headerClass: 'bg-blue-500/10 text-blue-800 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'ofertas',
    label: DEMAND_STATUS_LABELS.OFERTAS_RECEBIDAS,
    statuses: ['OFERTAS_RECEBIDAS'],
    headerClass: 'bg-purple-500/10 text-purple-800 dark:text-purple-300',
    dotClass: 'bg-purple-500',
  },
  {
    id: 'negociacao',
    label: DEMAND_STATUS_LABELS.EM_NEGOCIACAO,
    statuses: ['EM_NEGOCIACAO'],
    headerClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'aceita',
    label: DEMAND_STATUS_LABELS.PROPOSTA_ACEITA,
    statuses: ['PROPOSTA_ACEITA'],
    headerClass: 'bg-green-500/10 text-green-800 dark:text-green-300',
    dotClass: 'bg-green-500',
  },
  {
    id: 'cancelado',
    label: DEMAND_STATUS_LABELS.CANCELADO,
    statuses: ['CANCELADO'],
    headerClass: 'bg-red-500/10 text-red-800 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  {
    id: 'expirado',
    label: DEMAND_STATUS_LABELS.EXPIRADO,
    statuses: ['EXPIRADO'],
    headerClass: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    dotClass: 'bg-gray-400',
  },
]

function demandHref(demand: Demand): string {
  if (demand.status === 'RASCUNHO') {
    return `/buyer/demands/new?id=${demand.id}`
  }
  return `/buyer/demands/${demand.id}`
}

function KanbanCard({ demand }: { demand: Demand }) {
  const dateLabel = demand.published_at
    ? `Publicada ${new Date(demand.published_at).toLocaleDateString('pt-BR')}`
    : `Criada ${new Date(demand.created_at).toLocaleDateString('pt-BR')}`

  return (
    <Link
      to={demandHref(demand)}
      className="block rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
    >
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{demand.titulo}</p>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{demand.descricao}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {demand.cidade}/{demand.uf}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {demand.quantidade} {demand.unidade}
      </p>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{dateLabel}</p>
    </Link>
  )
}

function KanbanColumnView({
  column,
  demands,
}: {
  column: KanbanColumn
  demands: Demand[]
}) {
  return (
    <div className="flex h-full min-h-0 w-[min(100%,17.5rem)] min-w-[17.5rem] flex-1 flex-col rounded-xl border border-border/70 bg-muted/20">
      <div
        className={cn(
          'mx-2 mt-2 flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5',
          column.headerClass,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', column.dotClass)} />
          <span className="truncate text-xs font-semibold uppercase tracking-wide">{column.label}</span>
        </div>
        <span className="shrink-0 rounded-md bg-background/60 px-2 py-0.5 text-xs font-bold tabular-nums">
          {demands.length}
        </span>
      </div>

      <div className="scrollbar-kanban-column mx-2 mb-2 mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {demands.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-6">
            <p className="text-center text-xs text-muted-foreground">Nenhuma demanda</p>
          </div>
        ) : (
          demands.map((demand) => <KanbanCard key={demand.id} demand={demand} />)
        )}
      </div>
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex h-full min-h-0 gap-3 overflow-hidden">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex h-full min-h-0 w-[min(100%,17.5rem)] min-w-[17.5rem] flex-1 flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3"
        >
          <div className="h-9 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="min-h-0 flex-1 animate-pulse rounded-xl bg-muted/80" />
        </div>
      ))}
    </div>
  )
}

export function BuyerDashboardPage() {
  usePageTitle()
  const { data: demands, isLoading, error } = useDemands()

  const columnsData = useMemo(() => {
    const list = demands ?? []
    return KANBAN_COLUMNS.map((column) => ({
      column,
      demands: list
        .filter((d) => column.statuses.includes(d.status))
        .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()),
    }))
  }, [demands])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isSupabaseConfigured && (
        <Alert className="mx-4 mt-4 shrink-0 border-amber-500/50 text-amber-900 dark:text-amber-200 lg:mx-6">
          Configure o Supabase em <code className="text-xs">apps/web/.env.local</code> (URL e anon key do
          dashboard). O MCP do Cursor usa outro projeto — o app só lê o .env.
        </Alert>
      )}

      {error && (
        <Alert className="mx-4 mt-4 shrink-0 border-destructive/50 text-destructive lg:mx-6">
          <p>{formatSupabaseError(error)}</p>
          <p className="mt-2 text-xs opacity-80">
            Projeto no .env: <span className="font-mono">{getSupabaseProjectLabel()}</span>
          </p>
        </Alert>
      )}

      {isLoading ? (
        <div className="min-h-0 flex-1 px-3 pb-3 pt-3 lg:px-4">
          <KanbanSkeleton />
        </div>
      ) : (
        <div className="scrollbar-kanban-board flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden px-3 pb-3 pt-3 lg:px-4">
          {columnsData.map(({ column, demands: columnDemands }) => (
            <KanbanColumnView key={column.id} column={column} demands={columnDemands} />
          ))}
        </div>
      )}
    </div>
  )
}
