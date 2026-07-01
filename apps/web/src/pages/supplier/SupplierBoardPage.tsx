import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { useMatches, useMarkMatchViewed } from '@/hooks/use-matches'
import type { MatchFilters, DemandMatchWithDemand } from '@/services/matches'
import type { DemandMatch } from '@/services/matches'
import { DEMAND_STATUS_LABELS } from '@keve/shared'
import { DemandVariantSummary } from '@/components/buyer/DemandVariantSummary'
import { cn, formatExpiresAt, formatReceivedAt } from '@/lib/utils'

type StatusFilter = 'all' | DemandMatch['status']

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'notified', label: 'Novas' },
  { value: 'viewed', label: 'Visualizadas' },
  { value: 'offer_sent', label: 'Com proposta' },
  { value: 'dismissed', label: 'Dispensadas' },
]

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (score >= 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-muted text-muted-foreground'
}

export function SupplierBoardPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filters: MatchFilters | undefined = useMemo(() => {
    if (statusFilter === 'all') return undefined
    return { status: statusFilter }
  }, [statusFilter])

  const { data: matches = [], isLoading, isError } = useMatches(filters)
  const markViewed = useMarkMatchViewed()

  function handleMarkViewed(match: DemandMatchWithDemand, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (match.status !== 'notified') return
    markViewed.mutate(match.id)
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-20 -mx-4 bg-background/95 pt-3 backdrop-blur-sm md:static md:mx-0 md:bg-transparent md:pt-0 md:backdrop-blur-none">
        <div className="flex min-w-0 w-full gap-2 overflow-x-auto scroll-smooth border-b border-border/60 px-4 pt-1.5 pb-3 scroll-px-4 no-scrollbar md:flex-wrap md:overflow-visible md:border-b-0 md:px-0 md:pt-0 md:pb-0 md:scroll-px-0">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <GridSkeleton count={4} />}

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar as oportunidades.</p>
      )}

      {!isLoading && !isError && matches.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhuma oportunidade"
          description="Novas demandas aparecerão aqui quando houver match com seu perfil."
        />
      )}

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onMarkViewed={(e) => handleMarkViewed(match, e)}
            marking={markViewed.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  onMarkViewed,
  marking,
}: {
  match: DemandMatchWithDemand
  onMarkViewed: (e: React.MouseEvent) => void
  marking: boolean
}) {
  const demand = match.demand
  if (!demand) return null

  const demandStatusLabel = DEMAND_STATUS_LABELS[demand.status] ?? demand.status
  const isProposalAccepted = demand.status === 'PROPOSTA_ACEITA'
  const hasOfferSent = match.status === 'offer_sent'

  const actionLabel = isProposalAccepted
    ? 'Ver pedido'
    : hasOfferSent
      ? 'Ver proposta'
      : 'Enviar proposta'

  const actionHref = isProposalAccepted
    ? '/supplier/orders'
    : `/supplier/offers/${demand.id}`

  const expiresInfo =
    demand.status === 'EXPIRADO'
      ? { label: 'Expirada', isExpired: true, isUrgent: false }
      : isProposalAccepted || demand.status === 'CANCELADO'
        ? null
        : formatExpiresAt(demand.expires_at)
  const receivedLabel = formatReceivedAt(match.notified_at)

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-visible',
        match.status === 'notified' && 'border-primary/30',
      )}
    >
      <CardHeader className="flex shrink-0 flex-col gap-1.5 space-y-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 h-[2.75rem] min-w-0 flex-1 overflow-hidden text-base leading-snug">
            {demand.titulo}
          </CardTitle>
          <Badge className={cn('shrink-0 border-0 font-semibold', scoreColor(match.score))}>
            {match.score}%
          </Badge>
        </div>
        <p className="h-4 w-full truncate text-xs text-muted-foreground">
          {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade}
        </p>
        <div className="flex h-4 w-full min-w-0 items-center gap-1 overflow-x-auto text-[11px] leading-tight text-muted-foreground no-scrollbar">
          {expiresInfo && (
            <>
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap font-medium',
                  expiresInfo.isExpired && 'text-destructive',
                  expiresInfo.isUrgent && !expiresInfo.isExpired && 'text-amber-700 dark:text-amber-400',
                )}
              >
                {expiresInfo.label}
              </span>
              <span className="shrink-0 text-muted-foreground/50">·</span>
            </>
          )}
          <span className="whitespace-nowrap">{receivedLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-visible pt-0">
        <p className="line-clamp-2 h-10 shrink-0 overflow-hidden text-sm leading-snug text-muted-foreground">
          {demand.descricao}
        </p>
        <DemandVariantSummary demand={demand} className="mt-1 text-xs" />
        <div className="mt-3 -mx-6 flex min-h-6 items-center gap-2 overflow-x-auto px-6 pb-0.5 scroll-px-6 no-scrollbar">
          <Badge className="shrink-0 whitespace-nowrap border border-border bg-transparent text-xs">
            {demandStatusLabel}
          </Badge>
          {match.status === 'notified' && (
            <Badge className="shrink-0 whitespace-nowrap border-0 bg-primary/15 text-primary">
              Nova
            </Badge>
          )}
          {hasOfferSent && !isProposalAccepted && (
            <Badge className="shrink-0 whitespace-nowrap border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Proposta enviada
            </Badge>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          {match.status === 'notified' && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
              disabled={marking}
              aria-label="Marcar vista"
              onClick={onMarkViewed}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-10 min-w-0 flex-1"
            variant={isProposalAccepted || hasOfferSent ? 'secondary' : 'default'}
            asChild
          >
            <Link to={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
