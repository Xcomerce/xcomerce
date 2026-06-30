import { CLOTHING_SIZES } from '@keve/shared'
import { cn } from '@/lib/utils'

type ClothingSizePickerProps = {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}

export function ClothingSizePicker({ values, onChange, disabled }: ClothingSizePickerProps) {
  const selected = new Set(values.map((v) => v.toUpperCase()))

  function toggle(size: string) {
    if (disabled) return
    const key = size.toUpperCase()
    if (selected.has(key)) {
      onChange(values.filter((v) => v.toUpperCase() !== key))
    } else {
      onChange([...values, size])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CLOTHING_SIZES.map((size) => {
        const active = selected.has(size)
        return (
          <button
            key={size}
            type="button"
            disabled={disabled}
            onClick={() => toggle(size)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
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
  )
}
