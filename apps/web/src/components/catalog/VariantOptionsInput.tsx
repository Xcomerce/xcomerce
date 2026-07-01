import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type VariantOptionsInputProps = {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function VariantOptionsInput({
  values,
  onChange,
  placeholder = 'Digite e pressione Enter',
  disabled,
  className,
}: VariantOptionsInputProps) {
  const [draft, setDraft] = useState('')

  function addValue(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const next = [...values]
    for (const part of parts) {
      const key = part.toLowerCase()
      if (!next.some((v) => v.toLowerCase() === key)) next.push(part)
    }
    onChange(next)
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue(draft)
    }
  }

  function removeValue(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, index) => (
          <Badge key={`${value}-${index}`} className="gap-1 border-0 bg-secondary pr-1 text-secondary-foreground">
            {value}
            {!disabled && (
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => removeValue(index)}
                aria-label={`Remover ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) addValue(draft)
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}
