import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export type SearchableSelectOption = {
  value: string
  label: string
}

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

type SearchableSelectProps = {
  value?: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

const MENU_GAP = 4
const VIEWPORT_PADDING = 8
const PREFERRED_MENU_HEIGHT = 280

function getMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
  const spaceAbove = rect.top - VIEWPORT_PADDING
  const openUp = spaceBelow < PREFERRED_MENU_HEIGHT && spaceAbove > spaceBelow
  const maxHeight = Math.min(
    PREFERRED_MENU_HEIGHT,
    Math.max(160, openUp ? spaceAbove : spaceBelow),
  )

  return {
    top: openUp ? rect.top - maxHeight - MENU_GAP : rect.bottom + MENU_GAP,
    left: rect.left,
    width: rect.width,
    maxHeight,
  }
}

export function SearchableSelect({
  value = '',
  onValueChange,
  options,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado',
  disabled = false,
  loading = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => option.label.toLowerCase().includes(query))
  }, [options, search])

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return
    setMenuPosition(getMenuPosition(triggerRef.current))
  }, [])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleReposition = () => updateMenuPosition()

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setMenuPosition(null)
      return
    }

    const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timeout)
  }, [open])

  function handleSelect(nextValue: string) {
    onValueChange(nextValue)
    setOpen(false)
  }

  const dropdown =
    open && !disabled && menuPosition
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            className="z-[120] flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
          >
            <div className="shrink-0 border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-9"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setOpen(false)
                  }}
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto p-1 scrollbar-custom">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>
              ) : (
                filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10',
                        option.value === value && 'bg-accent/10 font-medium',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className={cn('relative', className)}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open && 'ring-2 ring-ring',
          )}
        >
          <span className={cn('truncate text-left', !selectedOption && !value && 'text-muted-foreground')}>
            {loading ? 'Carregando...' : (selectedOption?.label ?? value) || placeholder}
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          )}
        </button>
      </div>
      {dropdown}
    </>
  )
}
