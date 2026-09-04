import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fuzzyVariantSuggest,
  isStrictPrefixMatch,
  normalizeVariantValue,
  variantValuesEqual,
} from '@keve/shared'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fetchVariantAxisValues, type VariantAxisValueSuggestion } from '@/services/variant-values'
import {
  buildVariantNewKey,
  trackDiagnosticEvent,
} from '@/lib/diagnostics'

type DropdownPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

function mergeInputRefs(
  node: HTMLInputElement | null,
  localRef: React.MutableRefObject<HTMLInputElement | null>,
  externalRef?: React.Ref<HTMLInputElement>,
) {
  localRef.current = node
  if (typeof externalRef === 'function') {
    externalRef(node)
    return
  }
  if (externalRef && typeof externalRef === 'object') {
    externalRef.current = node
  }
}

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
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRefLocal = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateDropdownPosition = useCallback(() => {
    const input = inputRefLocal.current
    if (!input) return

    const rect = input.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const preferredHeight = 280
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow
    const maxHeight = Math.min(preferredHeight, openAbove ? spaceAbove : spaceBelow)

    setDropdownPosition({
      top: openAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(maxHeight, 120),
    })
  }, [])

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
      const target = event.target as Node
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
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

  useEffect(() => {
    if (!open) {
      setDropdownPosition(null)
      return
    }

    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [open, updateDropdownPosition, prefixMatches.length, fuzzyHints.length, loading])

  const showExactMissingHint =
    value.trim().length > 0 &&
    suggestions.length > 0 &&
    !exactMatch &&
    prefixMatches.length > 0

  function handleBlurTrack() {
    const trimmed = value.trim()
    if (!trimmed || !categoryId || exactMatch) return
    if (suggestions.some((s) => variantValuesEqual(s.value, trimmed))) return

    void trackDiagnosticEvent(
      'variant_value_new',
      buildVariantNewKey(categoryId, axisName, trimmed),
      {
        category_id: categoryId,
        axis_name: axisName,
        value: trimmed,
        side,
      },
      { userRole: side, dedupeKey: `variant:${categoryId}:${axisName}:${trimmed}` },
    )
  }

  const showDropdown = open && (prefixMatches.length > 0 || fuzzyHints.length > 0 || loading)

  const dropdownContent =
    showDropdown && dropdownPosition ? (
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: dropdownPosition.maxHeight,
        }}
        className="z-[100] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover shadow-lg"
      >
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
    ) : null

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={(node) => mergeInputRefs(node, inputRefLocal, inputRef)}
        value={value}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          setOpen(true)
          updateDropdownPosition()
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          handleBlurTrack()
          setOpen(false)
        }}
        onKeyDown={onKeyDown}
      />

      {typeof document !== 'undefined' && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}

      {showExactMissingHint ? (
        <p className={cn('mt-1 text-[11px] text-muted-foreground')}>
          Nenhum fornecedor cadastrou exatamente &quot;{value.trim()}&quot;
        </p>
      ) : null}
    </div>
  )
}
