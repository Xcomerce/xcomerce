import { Loader2, Check, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchingGlobe } from '@/components/common/SearchingGlobe'
import { cn } from '@/lib/utils'
import type { getEligibleSuppliers } from './utils'

type EligibleSuppliersPanelProps = {
  eligible: ReturnType<typeof getEligibleSuppliers>
  selectedCategory?: { name: string }
  watchedCity: string
  watchedUf: string
  deliverySummary?: string
  isSaving: boolean
  selectedCategoryId: string
  isSearching: boolean
  publishPending: boolean
  onPublish: () => void
  onCancel: () => void
}

function GlobeState({
  spinRadar,
  title,
  description,
}: {
  spinRadar: boolean
  title: string
  description: string
}) {
  return (
    <div className="flex w-full max-w-[240px] flex-col items-center gap-4 text-center">
      <SearchingGlobe active={spinRadar} spin size="sm" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function EligibleSuppliersPanel({
  eligible,
  selectedCategory,
  watchedCity,
  watchedUf,
  deliverySummary,
  isSaving,
  selectedCategoryId,
  isSearching,
  publishPending,
  onPublish,
  onCancel,
}: EligibleSuppliersPanelProps) {
  const showIdle = !selectedCategoryId
  const showSearching = !!selectedCategoryId && isSearching
  const showAwaitingAddress = !!selectedCategoryId && !isSearching && !watchedCity
  const showResults = !!selectedCategoryId && !isSearching && !!watchedCity && eligible.count > 0
  const showCenteredGlobe = showIdle || showSearching || showAwaitingAddress

  return (
    <aside className="glass-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden border-sidebar-border lg:border-l">
      <div className="shrink-0 px-3 pt-4">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Fornecedores elegíveis
        </p>
        {selectedCategory && (
          <p className="mx-3 mt-3 inline-flex w-fit items-center rounded-lg bg-sidebar-accent px-2.5 py-1 text-xs font-medium text-sidebar-accent-foreground">
            {selectedCategory.name}
          </p>
        )}
      </div>

      <div
        className={cn(
          'scrollbar-custom min-h-0 flex-1 px-3',
          showCenteredGlobe
            ? 'flex items-center justify-center overflow-hidden py-6'
            : 'overflow-y-auto py-4',
        )}
      >
        {showIdle && (
          <GlobeState
            spinRadar={false}
            title="Aguardando categoria"
            description="Selecione uma categoria para iniciar a busca de fornecedores na sua região."
          />
        )}

        {showSearching && (
          <GlobeState
            spinRadar
            title="Buscando fornecedores..."
            description="Mapeando parceiros compatíveis com a categoria e o endereço informado."
          />
        )}

        {showAwaitingAddress && (
          <GlobeState
            spinRadar
            title="Quase lá"
            description="Informe o CEP e a cidade para refinar os fornecedores elegíveis na região."
          />
        )}

        {showResults && (
          <div className="w-full space-y-4 text-left">
            <div className="rounded-xl border border-sidebar-border bg-card px-4 py-5 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
                Encontrados na região
              </p>
              <p className="mt-1 text-5xl font-bold tracking-tight text-primary">{eligible.count}</p>
            </div>

            {(watchedCity || deliverySummary) && (
              <div className="flex items-start gap-2 rounded-lg border border-sidebar-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {deliverySummary && (
                    <span className="block font-medium text-foreground">{deliverySummary}</span>
                  )}
                  {watchedCity && (
                    <span>
                      {watchedCity}
                      {watchedUf ? `/${watchedUf}` : ''}
                    </span>
                  )}
                </span>
              </div>
            )}

            <ul className="space-y-2">
              {eligible.list.map((sup, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-card px-3 py-2.5 text-sm font-medium text-foreground/90"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span className="truncate">{sup}</span>
                </li>
              ))}
            </ul>
            {eligible.others > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                + {eligible.others} outros na região
              </p>
            )}
          </div>
        )}

        {!showIdle && !showSearching && !showAwaitingAddress && !showResults && (
          <p className="w-full text-center text-sm text-muted-foreground">
            Nenhum fornecedor encontrado para esta combinação de categoria e região.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="space-y-2 rounded-xl border border-sidebar-border bg-card p-3">
          <Button
            type="button"
            disabled={isSaving || !selectedCategoryId}
            className="w-full rounded-lg bg-amber-500 py-5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-amber-600"
            onClick={onPublish}
          >
            {publishPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publicar
          </Button>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSaving}
              variant="outline"
              className="flex-1 rounded-lg border-sidebar-border py-4 text-xs font-semibold uppercase tracking-wide"
            >
              {isSaving && !publishPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg border-sidebar-border py-4 text-xs font-semibold uppercase tracking-wide"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
