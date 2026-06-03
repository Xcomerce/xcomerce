import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

type FormValues = CategoryInput

export function CategoriesAdminPage() {
  const { data: categories = [], isLoading } = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editing, setEditing] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: { name: '', description: '', sort_order: 0, is_active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', sort_order: 0, is_active: true })
    setShowForm(true)
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
    setShowForm(true)
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
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Desativar categoria "${name}"?`)) return
    try {
      await deleteCategory.mutateAsync(id)
      toast.success('Categoria desativada')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie categorias e subcategorias</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="flex gap-2">
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  Salvar
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && <GridSkeleton count={4} />}

      {!isLoading && categories.length === 0 && (
        <EmptyState
          icon={FolderTree}
          title="Nenhuma categoria"
          description="Crie a primeira categoria da plataforma."
          actionLabel="Nova categoria"
          onAction={openCreate}
        />
      )}

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.slug}</p>
                {cat.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!cat.is_active && (
                  <Badge className="border border-border bg-transparent">Inativa</Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(cat.id, cat.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
