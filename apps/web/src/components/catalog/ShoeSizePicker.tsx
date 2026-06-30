import { useMemo } from 'react'
import { SHOE_HALF_SIZES_BR, SHOE_SIZES_BR } from '@keve/shared'
import { cn } from '@/lib/utils'

type ShoeSizePickerProps = {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  includeHalfSizes?: boolean
  onIncludeHalfSizesChange?: (value: boolean) => void
}

export function ShoeSizePicker({
  values,
  onChange,
  disabled,
  includeHalfSizes = false,
  onIncludeHalfSizesChange,
}: ShoeSizePickerProps) {
  const options = useMemo(
    () => (includeHalfSizes ? [...SHOE_SIZES_BR, ...SHOE_HALF_SIZES_BR] : SHOE_SIZES_BR),
    [includeHalfSizes],
  )

  const selected = useMemo(() => new Set(values.map((v) => v.trim())), [values])

  function toggle(size: string) {
    if (disabled) return
    if (selected.has(size)) {
      onChange(values.filter((v) => v.trim() !== size))
    } else {
      onChange([...values, size].sort((a, b) => parseFloat(a) - parseFloat(b)))
    }
  }

  return (
    <div className="space-y-3">
      {onIncludeHalfSizesChange && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeHalfSizes}
            onChange={(e) => onIncludeHalfSizesChange(e.target.checked)}
            disabled={disabled}
            className="rounded border-border"
          />
          Incluir meios números
        </label>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {options.map((size) => {
          const active = selected.has(size)
          return (
            <button
              key={size}
              type="button"
              disabled={disabled}
              onClick={() => toggle(size)}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:bg-muted/50',
                disabled && 'opacity-50',
              )}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}
