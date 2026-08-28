import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProductFormActionsProps = {
  isSaving: boolean
  canSave: boolean
  isEdit: boolean
  isDeleting?: boolean
  onPublish: () => void
  onSaveDraft: () => void
  onDelete?: () => void
  onCancel?: () => void
  className?: string
  missingFields?: string[]
  isDraft?: boolean
}

export function ProductFormActions({
  isSaving,
  canSave,
  isEdit,
  isDeleting,
  onPublish,
  onSaveDraft,
  onDelete,
  onCancel,
  className,
  missingFields = [],
  isDraft = false,
}: ProductFormActionsProps) {
  const publishBlocked = !canSave || isSaving || missingFields.length > 0
  const publishLabel =
    missingFields.length > 0
      ? `Falta: ${missingFields.join(', ')}`
      : isEdit
        ? 'Salvar alterações'
        : 'Publicar produto'

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        disabled={publishBlocked}
        title={missingFields.length > 0 ? publishLabel : undefined}
        className="w-full rounded-xl py-5 text-sm font-semibold"
        onClick={onPublish}
      >
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {publishLabel}
      </Button>

      {!isEdit || isDraft ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          className="w-full rounded-xl border-sidebar-border py-4 text-sm font-semibold"
          onClick={onSaveDraft}
        >
          Salvar rascunho
        </Button>
      ) : null}

      {isEdit && onDelete ? (
        <Button
          type="button"
          variant="ghost"
          disabled={isDeleting}
          className="w-full gap-2 rounded-xl border border-destructive/20 bg-destructive/10 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Excluindo...' : 'Excluir produto'}
        </Button>
      ) : null}

      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-sidebar-border py-4 text-sm font-semibold lg:hidden"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      ) : null}
    </div>
  )
}
