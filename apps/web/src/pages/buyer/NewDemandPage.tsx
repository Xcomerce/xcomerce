import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { demandSchema, type DemandInput } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { PaywallModal } from '@/components/common/PaywallModal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useCategories } from '@/hooks/use-categories'
import {
  useCreateDemand,
  useDemand,
  usePublishDemand,
  useUpdateDemand,
} from '@/hooks/use-demands'
import { translateSupabaseError } from '@/lib/errors'

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function NewDemandPage() {
  usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id') ?? undefined
  const isEditing = !!editId

  const { data: existingDemand, isLoading: loadingDemand, error: demandError } = useDemand(editId)
  const { data: categories, isLoading: loadingCategories, error: categoriesError } = useCategories()
  const createDemand = useCreateDemand()
  const updateDemand = useUpdateDemand()
  const publishDemand = usePublishDemand()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<DemandInput>({
    resolver: zodResolver(demandSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      category_id: '',
      quantidade: 1,
      unidade: 'un',
      cidade: '',
      uf: '',
      raio_km: 50,
      prazo_desejado: '',
      observacoes: '',
    },
  })

  useEffect(() => {
    if (!existingDemand) return
    form.reset({
      titulo: existingDemand.titulo,
      descricao: existingDemand.descricao,
      category_id: existingDemand.category_id,
      quantidade: existingDemand.quantidade,
      unidade: existingDemand.unidade,
      cidade: existingDemand.cidade,
      uf: existingDemand.uf,
      raio_km: existingDemand.raio_km,
      prazo_desejado: existingDemand.prazo_desejado ?? '',
      observacoes: existingDemand.observacoes ?? '',
    })
  }, [existingDemand, form])

  async function saveDraft(values: DemandInput) {
    setFormError(null)
    try {
      if (isEditing && editId) {
        await updateDemand.mutateAsync({ id: editId, input: values })
        toast.success('Demanda atualizada')
        return editId
      }
      const created = await createDemand.mutateAsync(values)
      toast.success('Rascunho salvo')
      return created.id
    } catch (err) {
      const message = translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar')
      setFormError(message)
      toast.error(message)
      return null
    }
  }

  async function onSubmit(values: DemandInput) {
    const id = await saveDraft(values)
    if (!id) return
    navigate(`/buyer/demands/${id}`)
  }

  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) return

    const values = form.getValues()
    const id = isEditing && editId ? editId : await saveDraft(values)
    if (!id) return

    try {
      await publishDemand.mutateAsync(id)
      toast.success('Demanda publicada')
      navigate(`/buyer/demands/${id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar'
      if (message.includes('quota') || message.includes('QUOTA')) {
        setPaywallOpen(true)
      } else {
        toast.error(translateSupabaseError(message))
      }
    }
  }

  const isSaving =
    createDemand.isPending || updateDemand.isPending || publishDemand.isPending || form.formState.isSubmitting

  if (isEditing && loadingDemand) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isEditing && demandError) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        Não foi possível carregar a demanda para edição.
      </Alert>
    )
  }

  if (isEditing && existingDemand && existingDemand.status !== 'RASCUNHO') {
    return (
      <div className="space-y-4">
        <Alert>Esta demanda não pode mais ser editada.</Alert>
        <Button asChild variant="outline">
          <Link to={`/buyer/demands/${existingDemand.id}`}>Ver demanda</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/buyer/dashboard" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {isEditing ? 'Editar demanda' : 'Nova demanda'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Descreva o que você precisa para receber propostas de fornecedores.
          </p>
        </div>
      </div>

      {categoriesError && (
        <Alert className="border-destructive/50 text-destructive">
          Erro ao carregar categorias.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da demanda</CardTitle>
          <CardDescription>Preencha todos os campos obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <Alert className="mb-4 border-destructive/50 text-destructive">{formError}</Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Parafusos inox M8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Descreva especificações, marca preferida, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                        disabled={loadingCategories}
                        {...field}
                      >
                        <option value="">Selecione uma categoria</option>
                        {(categories ?? []).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="un, kg, cx..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm uppercase"
                          {...field}
                        >
                          <option value="">UF</option>
                          {BRAZILIAN_UFS.map((uf) => (
                            <option key={uf} value={uf}>
                              {uf}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="raio_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raio de busca (km)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prazo_desejado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo desejado (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" variant="outline" disabled={isSaving} className="flex-1">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar rascunho
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  disabled={isSaving}
                  className="flex-1"
                  onClick={() => void handlePublish()}
                >
                  {publishDemand.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Publicar demanda
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} quotaType="demands" />
    </div>
  )
}
