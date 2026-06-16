import type { FormEvent, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type FormDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  title: string
  description?: string
  children: ReactNode
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
}

export function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  loading = false,
}: FormDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => {
        if (!loading) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-dialog-title"
        aria-describedby={description ? 'form-dialog-description' : undefined}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-1">
          <h3 id="form-dialog-title" className="text-lg font-bold text-foreground">
            {title}
          </h3>
          {description && (
            <p id="form-dialog-description" className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {children}

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
              type="submit"
              disabled={loading}
              className="flex h-[38px] min-w-[100px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold shadow-sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
