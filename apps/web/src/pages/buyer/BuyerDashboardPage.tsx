import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDemands } from '@/hooks/use-demands'
import type { DemandStatus } from '@/services/demands'
import { cn } from '@/lib/utils'

type TabKey = 'all' | 'RASCUNHO' | 'PUBLICADA' | 'active' | 'PROPOSTA_ACEITA' | 'closed'

const TABS: { key: TabKey; label: string; statuses?: DemandStatus[] }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'RASCUNHO', label: 'Rascunhos', statuses: ['RASCUNHO'] },
  { key: 'PUBLICADA', label: 'Publicadas', statuses: ['PUBLICADA'] },
  {
    key: 'active',
    label: 'Em andamento',
    statuses: ['OFERTAS_RECEBIDAS', 'EM_NEGOCIACAO'],
  },
  { key: 'PROPOSTA_ACEITA', label: 'Aceitas', statuses: ['PROPOSTA_ACEITA'] },
  { key: 'closed', label: 'Encerradas', statuses: ['CANCELADO', 'EXPIRADO'] },
]

export function BuyerDashboardPage() {
  usePageTitle()
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const tabConfig = TABS.find((t) => t.key === activeTab)
  const filters = tabConfig?.statuses ? { status: tabConfig.statuses } : undefined
  const { data: demands, isLoading, error } = useDemands(filters)

  const sortedDemands = useMemo(
    () => [...(demands ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [demands],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Minhas demandas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe rascunhos, demandas publicadas e propostas recebidas.
          </p>
        </div>
        <Button asChild variant="accent">
          <Link to="/buyer/demands/new">
            <Plus className="h-4 w-4" />
            Nova demanda
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            variant={activeTab === tab.key ? 'default' : 'outline'}
            className={cn('shrink-0')}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && (
        <Alert className="border-destructive/50 text-destructive">
          Não foi possível carregar suas demandas.
        </Alert>
      )}

      {isLoading ? (
        <GridSkeleton count={6} />
      ) : sortedDemands.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma demanda encontrada"
          description={
            activeTab === 'all'
              ? 'Publique sua primeira demanda para receber propostas de fornecedores.'
              : 'Não há demandas neste filtro.'
          }
          actionLabel="Nova demanda"
          onAction={() => (window.location.href = '/buyer/demands/new')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedDemands.map((demand) => (
            <Link key={demand.id} to={`/buyer/demands/${demand.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{demand.titulo}</CardTitle>
                    <StatusBadge status={demand.status} kind="demand" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="line-clamp-2">{demand.descricao}</p>
                  <p>
                    {demand.quantidade} {demand.unidade} · {demand.cidade}/{demand.uf}
                  </p>
                  <p className="text-xs">
                    {demand.published_at
                      ? `Publicada em ${new Date(demand.published_at).toLocaleDateString('pt-BR')}`
                      : `Criada em ${new Date(demand.created_at).toLocaleDateString('pt-BR')}`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
