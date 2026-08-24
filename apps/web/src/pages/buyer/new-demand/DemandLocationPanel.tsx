import { MapPin } from 'lucide-react'
import type { CityLocation } from '@keve/shared'
import { CityMultiSelect } from '@/components/buyer/CityMultiSelect'
import { DemandFormActions } from '@/pages/buyer/new-demand/DemandFormActions'

type DemandLocationPanelProps = {
  cities: CityLocation[]
  onCitiesChange: (next: CityLocation[]) => void
  selectedCategory?: { name: string }
  isSaving: boolean
  selectedCategoryId: string
  publishPending: boolean
  onPublish: () => void
  onCancel: () => void
}

export function DemandLocationPanel({
  cities,
  onCitiesChange,
  selectedCategory,
  isSaving,
  selectedCategoryId,
  publishPending,
  onPublish,
  onCancel,
}: DemandLocationPanelProps) {
  return (
    <aside className="glass-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden border-sidebar-border max-lg:min-h-[min(20rem,40dvh)] lg:border-l">
      <div className="shrink-0 px-3 pt-4">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Localização da solicitação
        </p>
        {selectedCategory ? (
          <p className="mx-3 mt-3 inline-flex w-fit items-center rounded-lg bg-sidebar-accent px-2.5 py-1 text-xs font-medium text-sidebar-accent-foreground">
            {selectedCategory.name}
          </p>
        ) : null}
      </div>

      <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-sidebar-border bg-card px-4 py-4 shadow-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">Onde você precisa receber?</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Selecione uma ou mais cidades. Fornecedores compatíveis na região serão notificados.
              </p>
            </div>
          </div>

          <CityMultiSelect
            variant="panel"
            value={cities}
            onChange={onCitiesChange}
            title="Cidades de entrega"
            description="Digite e selecione as cidades onde deseja receber os produtos."
          />
        </div>
      </div>

      <div className="hidden shrink-0 border-t border-sidebar-border px-3 py-4 lg:block">
        <DemandFormActions
          isSaving={isSaving}
          selectedCategoryId={selectedCategoryId}
          publishPending={publishPending}
          onPublish={onPublish}
          onCancel={onCancel}
          disablePublish={cities.length === 0}
        />
      </div>
    </aside>
  )
}
