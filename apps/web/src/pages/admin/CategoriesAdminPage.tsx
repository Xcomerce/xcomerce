import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormDialog } from '@/components/common/FormDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-admin'
import type { CategoryInput } from '@/services/admin'
import type { Category } from '@/services/admin'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type FormValues = CategoryInput
type ActiveFilter = '' | 'active' | 'inactive'

const PAGE_SIZE = 25

function CategoriesPaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background pt-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function CategoriesAdminPage() {
  const { data: categories = [], isLoading } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Category | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const parentById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const cat of categories) map.set(cat.id, cat)
    return map
  }, [categories])

  const filteredCategories = useMemo(() => {
    let rows = [...categories]

    if (activeFilter === 'active') {
      rows = rows.filter((cat) => cat.is_active)
    } else if (activeFilter === 'inactive') {
      rows = rows.filter((cat) => !cat.is_active)
    }

    const query = search.trim().toLowerCase()
    if (query) {
      rows = rows.filter((cat) => {
        const name = cat.name.toLowerCase()
        const slug = cat.slug.toLowerCase()
        const description = cat.description?.toLowerCase() ?? ''
        return name.includes(query) || slug.includes(query) || description.includes(query)
      })
    }

    rows.sort((a, b) => {
      const aRoot = a.parent_id ? 1 : 0
      const bRoot = b.parent_id ? 1 : 0
      if (aRoot !== bRoot) return aRoot - bRoot
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    return rows
  }, [categories, search, activeFilter])

  const total = filteredCategories.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredCategories.slice(start, start + PAGE_SIZE)
  }, [filteredCategories, page])

  useEffect(() => {
    setPage(1)
  }, [search, activeFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const form = useForm<FormValues>({
    defaultValues: { name: '', description: '', sort_order: 0, is_active: true },
  })

  const isSaving = createCategory.isPending || updateCategory.isPending

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', sort_order: 0, is_active: true })
    setFormOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({
      name: cat.name,
      description: cat.description ?? '',
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      slug: cat.slug,
    })
    setFormOpen(true)
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, input: values })
        toast.success('Categoria atualizada')
      } else {
        await createCategory.mutateAsync(values)
        toast.success('Categoria criada')
      }
      closeForm()
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function confirmDelete() {
    if (!deletingCategory) return

    try {
      await deleteCategory.mutateAsync(deletingCategory.id)
      toast.success('Categoria desativada')
      setDeletingCategory(null)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function toggleActive(cat: Category, next: boolean) {
    setTogglingId(cat.id)
    try {
      await updateCategory.mutateAsync({ id: cat.id, input: { is_active: next } })
      toast.success(next ? 'Categoria ativada' : 'Categoria desativada')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <div className="relative z-10 shrink-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
              aria-label="Status"
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova categoria
          </Button>
        </div>
      </div>

      <div className="scrollbar-custom mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        {isLoading && <GridSkeleton count={10} />}

        {!isLoading && categories.length === 0 && (
          <EmptyState
            icon={FolderTree}
            title="Nenhuma categoria"
            description="Crie a primeira categoria da plataforma."
            actionLabel="Nova categoria"
            onAction={openCreate}
          />
        )}

        {!isLoading && categories.length > 0 && filteredCategories.length === 0 && (
          <EmptyState
            icon={FolderTree}
            title="Nenhum resultado"
            description="Ajuste os filtros para encontrar categorias."
          />
        )}

        {!isLoading && filteredCategories.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {paginatedCategories.map((cat) => {
              const parent = cat.parent_id ? parentById.get(cat.parent_id) : null
              return (
                <Card
                  key={cat.id}
                  className={cn('flex flex-col', !cat.is_active && 'opacity-70')}
                >
                  <CardContent className="flex flex-1 flex-col gap-3 py-4">
                    <div className="min-h-0 flex-1 space-y-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{cat.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {cat.slug}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {parent ? (
                          <Badge className="border border-border bg-transparent text-[10px] font-normal">
                            {parent.name}
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-[10px] font-normal text-primary">
                            Raiz
                          </Badge>
                        )}
                        <Badge
                          className={
                            cat.is_active
                              ? 'bg-emerald-500/10 text-[10px] font-normal text-emerald-700'
                              : 'border border-border bg-transparent text-[10px] font-normal text-muted-foreground'
                          }
                        >
                          {cat.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      <Switch
                        checked={cat.is_active}
                        disabled={togglingId === cat.id || updateCategory.isPending}
                        onCheckedChange={(checked) => void toggleActive(cat, checked)}
                        aria-label={cat.is_active ? 'Desativar categoria' : 'Ativar categoria'}
                      />
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingCategory(cat)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {!isLoading && total > 0 && (
        <CategoriesPaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      <FormDialog
        open={formOpen}
        onClose={closeForm}
        onSubmit={form.handleSubmit(onSubmit)}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description={
          editing
            ? 'Altere os dados da categoria selecionada.'
            : 'Preencha os dados para criar uma nova categoria.'
        }
        loading={isSaving}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...form.register('name', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" {...form.register('description')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Ordem</Label>
          <Input
            id="sort_order"
            type="number"
            {...form.register('sort_order', { valueAsNumber: true })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('is_active')} />
          Ativa
        </label>
      </FormDialog>

      <ConfirmDialog
        open={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => void confirmDelete()}
        title="Desativar categoria"
        description={`Desativar a categoria "${deletingCategory?.name}"? Ela deixará de aparecer para novos cadastros.`}
        confirmLabel="Desativar"
        variant="destructive"
        loading={deleteCategory.isPending}
      />
    </div>
  )
}
