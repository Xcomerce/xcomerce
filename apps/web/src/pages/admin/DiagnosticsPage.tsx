import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Stethoscope,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FormDialog } from '@/components/common/FormDialog'
import { Input } from '@/components/ui/input'
import {
  useAddVariantSuggestion,
  useCreateCategory,
  useDiagnosticGroups,
  useDemandNearMiss,
  useResolveDiagnosticGroup,
} from '@/hooks/use-admin'
import type { CategoryInput } from '@/services/admin'
import {
  getCategoryPrefillFromGroup,
  getDiagnosticEventLabel,
  getDiagnosticItemTitle,
  SKIP_REASON_LABELS,
  type DiagnosticGroup,
  type DiagnosticPeriod,
  type DiagnosticSection,
  type DiagnosticUserRoleFilter,
} from '@/services/diagnostics'
import { cn } from '@/lib/utils'

const PERIOD_OPTIONS: { value: DiagnosticPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

const ROLE_OPTIONS: { value: DiagnosticUserRoleFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'supplier', label: 'Fornecedor' },
]

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DiagnosticGroupCard({
  group,
  expanded,
  onToggle,
  onResolve,
  onCreateCategory,
  onAddVariant,
  onShowNearMiss,
}: {
  group: DiagnosticGroup
  expanded: boolean
  onToggle: () => void
  onResolve: () => void
  onCreateCategory: () => void
  onAddVariant: () => void
  onShowNearMiss: () => void
}) {
  const title = getDiagnosticItemTitle(group)
  const typeLabel = getDiagnosticEventLabel(group.event_type)
  const isResolved = Boolean(group.resolved_at)

  const frictionActions = group.event_type === 'search_no_result' || group.event_type === 'category_not_found'
  const variantAction = group.event_type === 'variant_value_new'
  const nearMissAction = group.event_type === 'demand_no_match'
  const technicalAction =
    group.event_type === 'server_error_500' ||
    group.event_type === 'upload_failure' ||
    group.event_type === 'request_timeout' ||
    group.event_type === 'client_js_error'

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-colors',
        isResolved ? 'border-border/60 opacity-75' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-secondary text-secondary-foreground text-xs">
              {typeLabel}
            </Badge>
            {isResolved ? (
              <Badge className="gap-1 border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Resolvido
              </Badge>
            ) : null}
          </div>
          <p className="font-medium text-foreground">{title}</p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Users className="h-3.5 w-3.5" />
              {group.affected_users} {group.affected_users === 1 ? 'pessoa' : 'pessoas'}
            </span>
            <span>{group.total_occurrences} ocorrências</span>
            <span>1ª: {formatDateTime(group.first_seen)}</span>
            <span>Última: {formatDateTime(group.last_seen)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isResolved && frictionActions ? (
            <>
              <Button size="sm" variant="outline" onClick={onCreateCategory}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Criar categoria
              </Button>
              <Button size="sm" variant="ghost" onClick={onResolve}>
                Marcar resolvido
              </Button>
            </>
          ) : null}
          {!isResolved && variantAction ? (
            <>
              <Button size="sm" variant="outline" onClick={onAddVariant}>
                Adicionar à lista
              </Button>
              <Button size="sm" variant="ghost" onClick={onResolve}>
                Marcar resolvido
              </Button>
            </>
          ) : null}
          {!isResolved && nearMissAction ? (
            <>
              <Button size="sm" variant="outline" onClick={onShowNearMiss}>
                Ver perto
              </Button>
              <Button size="sm" variant="ghost" onClick={onResolve}>
                Marcar resolvido
              </Button>
            </>
          ) : null}
          {!isResolved && !frictionActions && !variantAction && !nearMissAction ? (
            <Button size="sm" variant="outline" onClick={onResolve}>
              {technicalAction ? 'Marcar corrigido' : 'Marcar resolvido'}
            </Button>
          ) : null}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggle}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border/60 px-4 py-3">
          <pre className="max-h-40 overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            {JSON.stringify(group.sample_payload ?? {}, null, 2)}
          </pre>
          {isResolved && group.resolved_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Resolvido em {formatDateTime(group.resolved_at)}
              {group.resolution_type ? ` (${group.resolution_type})` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function DiagnosticsPage() {
  const [searchParams] = useSearchParams()
  const highlightGroup = searchParams.get('group')

  const [section, setSection] = useState<DiagnosticSection>('friction')
  const [period, setPeriod] = useState<DiagnosticPeriod>('7d')
  const [userRole, setUserRole] = useState<DiagnosticUserRoleFilter | 'all'>('all')
  const [hideResolved, setHideResolved] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(highlightGroup)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryPrefill, setCategoryPrefill] = useState<Partial<CategoryInput>>({})
  const [activeGroup, setActiveGroup] = useState<DiagnosticGroup | null>(null)

  const [nearMissDemandId, setNearMissDemandId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      section,
      period,
      userRole: userRole === 'all' ? null : userRole,
      hideResolved,
    }),
    [section, period, userRole, hideResolved],
  )

  const { data: groups = [], isLoading, refetch, isFetching } = useDiagnosticGroups(filters)
  const resolveGroup = useResolveDiagnosticGroup()
  const createCategory = useCreateCategory()
  const addVariant = useAddVariantSuggestion()
  const { data: nearMiss = [], isLoading: nearMissLoading } = useDemandNearMiss(nearMissDemandId)

  const sortedGroups = useMemo(() => {
    if (!highlightGroup) return groups
    return [...groups].sort((a, b) => {
      if (a.group_key === highlightGroup) return -1
      if (b.group_key === highlightGroup) return 1
      return 0
    })
  }, [groups, highlightGroup])

  async function handleResolve(group: DiagnosticGroup, resolutionType: 'marked_resolved' | 'technical_fixed' = 'marked_resolved') {
    try {
      await resolveGroup.mutateAsync({
        groupKey: group.group_key,
        eventType: group.event_type,
        resolutionType:
          group.event_type.startsWith('server_') ||
          group.event_type.includes('error') ||
          group.event_type.includes('timeout') ||
          group.event_type.includes('upload')
            ? 'technical_fixed'
            : resolutionType,
      })
      toast.success('Item marcado como resolvido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resolver')
    }
  }

  function openCreateCategory(group: DiagnosticGroup) {
    setActiveGroup(group)
    setCategoryPrefill(getCategoryPrefillFromGroup(group))
    setCategoryDialogOpen(true)
  }

  async function submitCategory(input: CategoryInput) {
    try {
      await createCategory.mutateAsync(input)
      if (activeGroup) {
        await resolveGroup.mutateAsync({
          groupKey: activeGroup.group_key,
          eventType: activeGroup.event_type,
          resolutionType: 'category_created',
          metadata: { category_name: input.name },
        })
      }
      toast.success('Categoria criada')
      setCategoryDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar categoria')
    }
  }

  async function handleAddVariant(group: DiagnosticGroup) {
    const payload = group.sample_payload ?? {}
    const categoryId = String(payload.category_id ?? '')
    const axisName = String(payload.axis_name ?? '')
    const value = String(payload.value ?? '')
    if (!categoryId || !axisName || !value) {
      toast.error('Dados insuficientes no registro')
      return
    }
    try {
      await addVariant.mutateAsync({
        categoryId,
        axisName,
        value,
        sourceGroupKey: group.group_key,
      })
      toast.success('Valor adicionado às sugestões')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar valor')
    }
  }

  function openNearMiss(group: DiagnosticGroup) {
    const demandId = String(group.sample_payload?.demand_id ?? group.group_key.split(':')[1] ?? '')
    if (!demandId) {
      toast.error('ID da solicitação não encontrado')
      return
    }
    setNearMissDemandId(demandId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Diagnóstico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onde as pessoas travam e erros técnicos, agrupados por ocorrência.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={section === 'friction' ? 'default' : 'outline'}
          onClick={() => setSection('friction')}
          className="gap-2"
        >
          <Stethoscope className="h-4 w-4" />
          Onde travam
        </Button>
        <Button
          variant={section === 'technical' ? 'default' : 'outline'}
          onClick={() => setSection('technical')}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          Erros técnicos
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={period === opt.value ? 'default' : 'outline'}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {section === 'friction' ? (
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={userRole === opt.value ? 'secondary' : 'outline'}
                onClick={() => setUserRole(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Switch id="hide-resolved" checked={hideResolved} onCheckedChange={setHideResolved} />
          <Label htmlFor="hide-resolved" className="text-sm">
            Ocultar resolvidos
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : sortedGroups.length === 0 ? (
        <EmptyState
          icon={section === 'friction' ? Stethoscope : Activity}
          title="Nenhum item no período"
          description="Ajuste os filtros ou aguarde novos eventos na plataforma."
        />
      ) : (
        <div className="space-y-3">
          {sortedGroups.map((group) => (
            <DiagnosticGroupCard
              key={`${group.event_type}:${group.group_key}`}
              group={group}
              expanded={expandedKey === group.group_key}
              onToggle={() =>
                setExpandedKey((prev) => (prev === group.group_key ? null : group.group_key))
              }
              onResolve={() => void handleResolve(group)}
              onCreateCategory={() => openCreateCategory(group)}
              onAddVariant={() => void handleAddVariant(group)}
              onShowNearMiss={() => openNearMiss(group)}
            />
          ))}
        </div>
      )}

      <FormDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        title="Criar categoria"
        description="Pré-preenchido a partir da busca ou categoria não encontrada."
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
          const slug = (form.elements.namedItem('slug') as HTMLInputElement).value.trim()
          if (!name || !slug) return
          void submitCategory({
            name,
            slug,
            is_active: true,
            parent_id: null,
            sort_order: 0,
          })
        }}
        submitLabel="Criar"
        loading={createCategory.isPending}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={categoryPrefill.name ?? ''} required />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={categoryPrefill.slug ?? ''} required />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(nearMissDemandId)}
        onClose={() => setNearMissDemandId(null)}
        title="Fornecedores próximos"
        description="Avaliação do último match — por que não bateram ou quem foi notificado."
        onSubmit={(e) => {
          e.preventDefault()
          setNearMissDemandId(null)
        }}
        submitLabel="Fechar"
        cancelLabel=""
      >
        {nearMissLoading ? (
          <LoadingSkeleton className="h-32 w-full" />
        ) : nearMiss.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro de avaliação para esta solicitação.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {nearMiss.map((row) => (
              <div
                key={row.supplier_id}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{row.supplier_name}</span>
                  <Badge
                    className={
                      row.outcome === 'matched'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }
                  >
                    {row.outcome === 'matched' ? 'Match' : 'Ignorado'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[row.service_city, row.service_uf].filter(Boolean).join('/') || 'Sem cidade'}
                  {row.score != null ? ` · score ${row.score}` : ''}
                </p>
                {row.skip_reason ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {SKIP_REASON_LABELS[row.skip_reason] ?? row.skip_reason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </FormDialog>
    </div>
  )
}
