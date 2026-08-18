import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useSearchSuggestions } from '@/hooks/use-products'
import { cn } from '@/lib/utils'
import type { SearchSuggestion } from '@keve/shared'

const SUGGESTION_LABELS: Record<SearchSuggestion['suggestionType'], string> = {
  produto: 'Produto',
  marca: 'Marca',
  categoria: 'Categoria',
  cor: 'Cor',
}

type FeedSearchInputProps = {
  className?: string
}

export function FeedSearchInput({ className }: FeedSearchInputProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useState(urlQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery)
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(urlQuery)
    setDebouncedQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = inputValue.trim()
      setDebouncedQuery(trimmed)
      if (trimmed !== urlQuery) {
        setSearchParams(
          (prev) => {
            if (trimmed) {
              prev.set('search', trimmed)
            } else {
              prev.delete('search')
            }
            return prev
          },
          { replace: true },
        )
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [inputValue, urlQuery, setSearchParams])

  const { data: suggestions = [] } = useSearchSuggestions(debouncedQuery, isFocused)

  const showSuggestions = isFocused && suggestions.length > 0

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function applySuggestion(value: string) {
    setInputValue(value)
    setDebouncedQuery(value)
    setSearchParams(
      (prev) => {
        prev.set('search', value)
        return prev
      },
      { replace: true },
    )
    setIsFocused(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      applySuggestion(suggestions[activeIndex].suggestion)
    } else if (event.key === 'Escape') {
      setIsFocused(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0 flex-1', className)}>
      <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          enterKeyHint="search"
          placeholder="Buscar produto, categoria ou fornecedor"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          aria-label="Buscar produtos"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          role="combobox"
          className="min-w-0 flex-1 bg-transparent py-1 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
        />
      </div>

      {showSuggestions ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          {suggestions.map((item, index) => (
            <li key={`${item.suggestionType}-${item.suggestion}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySuggestion(item.suggestion)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/70',
                  index === activeIndex && 'bg-secondary/70',
                )}
              >
                <span className="truncate text-foreground">{item.suggestion}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {SUGGESTION_LABELS[item.suggestionType]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
