import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DemandFormActionsProps = {
  isSaving: boolean
  selectedCategoryId: string
  publishPending: boolean
  onPublish: () => void
  onCancel: () => void
  className?: string
  disablePublish?: boolean
  missingFields?: string[]
}

const FIELD_LABELS: Record<string, string> = {
  produto: 'produto',
  categoria: 'categoria',
  cidade: 'cidade',
  quantidade: 'quantidade',
}

export function DemandFormActions({
  isSaving,
  selectedCategoryId,
  publishPending,
  onPublish,
  onCancel,
  className,
  disablePublish = false,
  missingFields = [],
}: DemandFormActionsProps) {
  const blocked = isSaving || !selectedCategoryId || disablePublish || missingFields.length > 0
  const missingLabel =
    missingFields.length > 0
      ? `Falta: ${missingFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}`
      : 'Publicar'

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        disabled={blocked}
        title={missingFields.length > 0 ? missingLabel : undefined}
        className="w-full rounded-lg bg-primary py-5 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-sm hover:bg-brand-primary-dark"
        onClick={onPublish}
      >
        {publishPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {missingLabel}
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
  )
}
