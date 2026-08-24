import { useMemo, useState } from 'react'
import { getLeafCategories, type CategoryNode } from '@keve/shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useBuyerFavoriteCategories } from '@/hooks/use-buyer-favorites'

type CategoryPickerProps = {
  categories: Array<CategoryNode & { name: string }>
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
  listClassName?: string
}

export function CategoryPicker({
  categories,
  value,
  onValueChange,
  disabled = false,
  loading = false,
  listClassName,
}: CategoryPickerProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<'suggested' | 'all'>('suggested')
  const [search, setSearch] = useState('')
  const { data: favoriteIds = [] } = useBuyerFavoriteCategories(user?.id)

  const leafCategories = useMemo(() => getLeafCategories(categories), [categories])

  const suggestedCategories = useMemo(() => {
    const favorites = leafCategories.filter((category) => favoriteIds.includes(category.id))
    if (favorites.length > 0) return favorites.slice(0, 8)
    return leafCategories.slice(0, 8)
  }, [favoriteIds, leafCategories])

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()
    const source = tab === 'suggested' ? suggestedCategories : leafCategories
    if (!query) return source
    return leafCategories.filter((category) => category.name.toLowerCase().includes(query))
  }, [leafCategories, search, suggestedCategories, tab])

  const selectedCategory = leafCategories.find((category) => category.id === value)

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background p-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'suggested' ? 'default' : 'outline'}
          className="rounded-lg"
          onClick={() => setTab('suggested')}
          disabled={disabled}
        >
          Sugestões
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'all' ? 'default' : 'outline'}
          className="rounded-lg"
          onClick={() => setTab('all')}
          disabled={disabled}
        >
          Todas
        </Button>
      </div>

      {tab === 'all' ? (
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar categoria..."
          disabled={disabled || loading}
        />
      ) : null}

      {selectedCategory ? (
        <p className="text-xs text-muted-foreground">
          Selecionada: <span className="font-medium text-foreground">{selectedCategory.name}</span>
        </p>
      ) : null}

      <div className={cn('max-h-48 space-y-1 overflow-y-auto', listClassName)}>
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Carregando categorias...</p>
        ) : filteredCategories.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
        ) : (
          filteredCategories.map((category) => {
            const isSelected = category.id === value

            return (
              <button
                key={category.id}
                type="button"
                className={cn(
                  'flex w-full items-center rounded-lg border px-2 py-1.5 text-left text-sm text-foreground',
                  isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40',
                )}
                disabled={disabled}
                onClick={() => onValueChange(category.id)}
              >
                {category.name}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
