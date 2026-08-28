import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fuzzyVariantSuggest,
  isStrictPrefixMatch,
  normalizeVariantValue,
  variantValuesEqual,
} from '@keve/shared'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fetchVariantAxisValues, type VariantAxisValueSuggestion } from '@/services/variant-values'

type VariantValueAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  categoryId?: string
  axisName: string
  side?: 'buyer' | 'supplier'
  placeholder?: string
  className?: string
  colorAxis?: boolean
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.Ref<HTMLInputElement>
}

export function VariantValueAutocomplete({
  value,
  onChange,
  categoryId,
  axisName,
  side = 'buyer',
  placeholder,
  className,
  colorAxis = false,
  onKeyDown,
  inputRef,
}: VariantValueAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<VariantAxisValueSuggestion[]>([])
  const [fuzzyHints, setFuzzyHints] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSuggestions = useCallback(
    async (query: string) => {
      if (!categoryId || !axisName.trim()) {
        setSuggestions([])
        setFuzzyHints([])
        return
      }

      setLoading(true)
      try {
        const results = await fetchVariantAxisValues(categoryId, axisName, query, side)
        setSuggestions(results)

        if (side === 'supplier' && query.trim() && results.length === 0) {
          const allResults = await fetchVariantAxisValues(categoryId, axisName, '', side, 50)
          const fuzzy = fuzzyVariantSuggest(
            query,
            allResults.map((r) => r.value),
            { colorAxis },
          )
          setFuzzyHints(fuzzy.map((f) => f.value).slice(0, 3))
        } else {
          setFuzzyHints([])
        }
      } catch {
        setSuggestions([])
        setFuzzyHints([])
      } finally {
        setLoading(false)
      }
    },
    [categoryId, axisName, side, colorAxis],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadSuggestions(value)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, loadSuggestions])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exactMatch = useMemo(
    () => suggestions.some((s) => variantValuesEqual(s.value, value)),
    [suggestions, value],
  )

  const prefixMatches = useMemo(() => {
    const q = normalizeVariantValue(value)
    if (!q) return suggestions
    return suggestions.filter((s) => isStrictPrefixMatch(value, s.value) || normalizeVariantValue(s.value).includes(q))
  }, [suggestions, value])

  const showExactMissingHint =
    value.trim().length > 0 &&
    suggestions.length > 0 &&
    !exactMatch &&
    prefixMatches.length > 0

  const showDropdown = open && (prefixMatches.length > 0 || fuzzyHints.length > 0 || loading)

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />

      {showDropdown ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
          ) : null}

          {prefixMatches.map((item) => (
            <button
              key={item.normalized}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(item.value)
                setOpen(false)
              }}
            >
              <span>{item.value}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.supplier_count} {item.supplier_count === 1 ? 'fornecedor' : 'fornecedores'}
              </span>
            </button>
          ))}

          {fuzzyHints.length > 0 ? (
            <div className="border-t border-border/60 px-3 py-2">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Você quis dizer?</p>
              {fuzzyHints.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(hint)
                    setOpen(false)
                  }}
                >
                  {hint}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showExactMissingHint ? (
        <p className={cn('mt-1 text-[11px] text-muted-foreground')}>
          Nenhum fornecedor cadastrou exatamente &quot;{value.trim()}&quot;
        </p>
      ) : null}
    </div>
  )
}
