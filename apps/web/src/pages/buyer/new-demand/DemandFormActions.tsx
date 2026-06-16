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
}

export function DemandFormActions({
  isSaving,
  selectedCategoryId,
  publishPending,
  onPublish,
  onCancel,
  className,
}: DemandFormActionsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        disabled={isSaving || !selectedCategoryId}
        className="w-full rounded-lg bg-primary py-5 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-sm hover:bg-brand-primary-dark"
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
  )
}
