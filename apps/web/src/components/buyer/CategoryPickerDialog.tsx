import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CategoryNode } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { CategoryPicker } from '@/components/buyer/CategoryPicker'

type CategoryPickerDialogProps = {
  open: boolean
  onClose: () => void
  categories: Array<CategoryNode & { name: string }>
  value: string
  onApply: (value: string) => void
  loading?: boolean
}

export function CategoryPickerDialog({
  open,
  onClose,
  categories,
  value,
  onApply,
  loading = false,
}: CategoryPickerDialogProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  if (!open) return null

  function handleApply() {
    onApply(draft)
    onClose()
  }

  function handleClear() {
    setDraft('')
    onApply('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-picker-title"
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div>
            <h3 id="category-picker-title" className="font-display text-lg font-semibold text-foreground">
              Escolher categoria
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Busque ou navegue por todas as categorias.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <CategoryPicker
            categories={categories}
            value={draft}
            onValueChange={setDraft}
            disabled={loading}
            loading={loading}
            listClassName="max-h-[min(50vh,320px)]"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="ghost" onClick={handleClear} disabled={loading} className="rounded-xl">
            Limpar filtro
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply} disabled={loading || !draft} className="rounded-xl">
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  )
}
