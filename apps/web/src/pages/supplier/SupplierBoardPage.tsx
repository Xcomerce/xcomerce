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
import { cn } from '@/lib/utils'

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">
            Demandas compatíveis com seu perfil e área de atuação
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
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

      <div className="grid gap-4 md:grid-cols-2">
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

  return (
    <Card className={cn(match.status === 'notified' && 'border-primary/30')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="line-clamp-2 text-base">{demand.titulo}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade}
          </p>
        </div>
        <Badge className={cn('shrink-0 border-0 font-semibold', scoreColor(match.score))}>
          {match.score}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">{demand.descricao}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-border bg-transparent text-xs">
            {demandStatusLabel}
          </Badge>
          {match.status === 'notified' && (
            <Badge className="bg-primary/15 text-primary border-0">Nova</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {match.status === 'notified' && (
            <Button
              size="sm"
              variant="outline"
              disabled={marking}
              onClick={onMarkViewed}
            >
              <Eye className="mr-1 h-4 w-4" />
              Marcar vista
            </Button>
          )}
          <Button size="sm" className="flex-1" asChild>
            <Link to={`/supplier/offers/${demand.id}`}>Enviar proposta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
