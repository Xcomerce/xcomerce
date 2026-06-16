import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!open) return null

  const isDestructive = variant === 'destructive'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            isDestructive
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary',
          )}
        >
          {isDestructive ? <Trash2 className="h-6 w-6" /> : null}
        </div>

        <div className="space-y-1">
          <h3 id="confirm-dialog-title" className="text-lg font-bold text-foreground">
            {title}
          </h3>
          <p id="confirm-dialog-description" className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex h-[38px] min-w-[100px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold shadow-sm',
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
