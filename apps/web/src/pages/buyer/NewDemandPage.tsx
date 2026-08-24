import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  demandSchema,
  getLeafCategories,
  type DemandInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { PaywallModal } from '@/components/common/PaywallModal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { DemandVariantFields } from '@/components/buyer/DemandVariantFields'
import { usePageTitle } from '@/hooks/use-page-title'
import { useCategories } from '@/hooks/use-categories'
import {
  useCreateDemand,
  useDemand,
  usePublishDemand,
  useUpdateDemand,
} from '@/hooks/use-demands'
import { translateSupabaseError, formatSupabaseError, isQuotaExceededError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { CategoryPicker } from '@/components/buyer/CategoryPicker'
import { ScrollPageShell, SCROLL_PAGE_SECTION_CLASS } from '@/components/layout/ScrollPageShell'
import {
  NATIVE_FIELD_CLASS,
} from '@/pages/buyer/new-demand/constants'
import { DemandFormActions } from '@/pages/buyer/new-demand/DemandFormActions'
import { DemandLocationPanel } from '@/pages/buyer/new-demand/DemandLocationPanel'
import { useDemandLocationDefaults } from '@/hooks/use-demand-location-defaults'
import { demandSpecificationsFromRecord, syncDemandQuantidadeFromSpecifications } from '@/lib/demand-specifications'
import { formatDateTimeLocalInput, parseDateTimeLocalInput } from '@/lib/datetime'

export function NewDemandPage() {
  usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const editId = searchParams.get('id') ?? undefined
  const isEditing = !!editId
  const stateData = location.state as {
    categoryId?: string
    title?: string
    description?: string
    city?: string
    uf?: string
    precoReferencia?: number | null
    temCor?: boolean
    temTamanho?: boolean
    tipoTamanho?: 'roupa' | 'calcado' | 'numerico' | 'livre' | null
    cores?: string[]
    tamanhos?: string[]
    selectedCor?: string
    selectedTamanho?: string
  } | null

  const productVariantSource = !isEditing && stateData
    ? {
        temCor: stateData.temCor,
        temTamanho: stateData.temTamanho,
        tipoTamanho: stateData.tipoTamanho,
        cores: stateData.cores,
        tamanhos: stateData.tamanhos,
      }
    : null

  const { data: existingDemand, isLoading: loadingDemand, error: demandError } = useDemand(editId)
  const { data: categories, isLoading: loadingCategories, error: categoriesError } = useCategories()
  const createDemand = useCreateDemand()
  const updateDemand = useUpdateDemand()
  const publishDemand = usePublishDemand()
  const demandLocation = useDemandLocationDefaults()

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const hasAppliedProductPrefillRef = useRef(false)

  const form = useForm<DemandInput>({
    resolver: zodResolver(demandSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      category_id: '',
      unidade: 'un',
      cidade: '',
      uf: '',
      cidades: [],
      raio_km: 50,
      prazo_desejado: '',
      observacoes: '',
      especificacoes: [],
    },
  })

  const selectedCategoryId = form.watch('category_id')
  const watchedCities = form.watch('cidades') ?? []
  const leafCategories = useMemo(() => getLeafCategories(categories ?? []), [categories])
  const selectedCategory = leafCategories.find((c) => c.id === selectedCategoryId)
  const descricaoPlaceholder = useMemo(() => {
    const names = leafCategories.slice(0, 5).map((category) => category.name)
    if (names.length === 0) return 'Ex> ...'
    return `Ex> ${names.join(', ')}`
  }, [leafCategories])
  const isSaving =
    createDemand.isPending ||
    updateDemand.isPending ||
    publishDemand.isPending ||
    form.formState.isSubmitting

  useEffect(() => {
    if (isEditing || hasAppliedProductPrefillRef.current) return
    if (!stateData) return
    hasAppliedProductPrefillRef.current = true

    if (stateData.categoryId) form.setValue('category_id', stateData.categoryId)
    if (stateData.title) form.setValue('titulo', stateData.title)
    if (stateData.description) form.setValue('descricao', stateData.description)
    if (stateData.city && stateData.uf) {
      form.setValue('cidades', [{ cidade: stateData.city, uf: stateData.uf }])
    }
    if (stateData.precoReferencia != null && stateData.precoReferencia > 0) {
      form.setValue('preco_referencia_mercado', stateData.precoReferencia)
    }
    if (stateData.selectedCor || stateData.selectedTamanho) {
      form.setValue('especificacoes', [
        {
          cor: stateData.selectedCor ?? '',
          tamanho: stateData.selectedTamanho ?? '',
          quantidade: 1,
        },
      ])
    }
  }, [stateData, isEditing, form])

  useEffect(() => {
    if (isEditing || !demandLocation.ready) return
    if (watchedCities.length === 0 && demandLocation.cidade && demandLocation.uf) {
      form.setValue('cidades', [{ cidade: demandLocation.cidade, uf: demandLocation.uf }])
    }
    if (!form.getValues('cidade')) form.setValue('cidade', demandLocation.cidade)
    if (!form.getValues('uf')) form.setValue('uf', demandLocation.uf)
    if (!form.getValues('raio_km')) form.setValue('raio_km', demandLocation.raio_km)
  }, [demandLocation, isEditing, form, watchedCities.length])

  useEffect(() => {
    if (!existingDemand) return
    form.reset({
      titulo: existingDemand.titulo,
      descricao: existingDemand.descricao,
      category_id: existingDemand.category_id,
      unidade: existingDemand.unidade,
      cidade: existingDemand.cidade,
      uf: existingDemand.uf,
      cidades: Array.isArray(existingDemand.cidades)
        ? existingDemand.cidades
        : existingDemand.cidade && existingDemand.uf
          ? [{ cidade: existingDemand.cidade, uf: existingDemand.uf }]
          : [],
      raio_km: existingDemand.raio_km,
      prazo_desejado: existingDemand.prazo_desejado ?? '',
      observacoes: existingDemand.observacoes ?? '',
      preco_referencia_mercado: existingDemand.preco_referencia_mercado ?? undefined,
      especificacoes: demandSpecificationsFromRecord(existingDemand),
    })
  }, [existingDemand, form])

  function handleCitiesChange(nextCities: Array<{ cidade: string; uf: string }>) {
    form.setValue('cidades', nextCities, { shouldDirty: true, shouldValidate: true })
    const primary = nextCities[0]
    if (primary) {
      form.setValue('cidade', primary.cidade, { shouldDirty: true })
      form.setValue('uf', primary.uf, { shouldDirty: true })
    }
  }

  async function saveDraft(values: DemandInput) {
    setFormError(null)
    const payload = syncDemandQuantidadeFromSpecifications({
      ...values,
      cidade: values.cidade || demandLocation.cidade,
      uf: values.uf || demandLocation.uf,
      raio_km: values.raio_km || demandLocation.raio_km,
    })
    try {
      if (isEditing && editId) {
        await updateDemand.mutateAsync({ id: editId, input: payload })
        toast.success('Pedido atualizado')
        return editId
      }
      const created = await createDemand.mutateAsync(payload)
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
    navigate('/buyer/dashboard')
  }

  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) return
    const values = form.getValues()
    const id = isEditing && editId ? editId : await saveDraft(values)
    if (!id) return
    try {
      await publishDemand.mutateAsync(id)
      toast.success('Pedido publicado')
      navigate('/buyer/dashboard')
    } catch (err) {
      if (isQuotaExceededError(err)) {
        setPaywallOpen(true)
        return
      }
      toast.error(formatSupabaseError(err))
    }
  }

  if (isEditing && loadingDemand) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isEditing && demandError) {
    return (
      <div className="p-4 lg:p-6">
        <Alert className="border-destructive/50 text-destructive">
          Não foi possível carregar o pedido para edição.
        </Alert>
      </div>
    )
  }

  if (isEditing && existingDemand && existingDemand.status !== 'RASCUNHO') {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Alert>Este pedido não pode mais ser editado.</Alert>
        <Button asChild variant="outline">
          <Link to={`/buyer/demands/${existingDemand.id}`}>Ver pedido</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <ScrollPageShell
            mobileFooter={
              <footer className="shrink-0 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:hidden">
                <DemandFormActions
                  isSaving={isSaving}
                  selectedCategoryId={selectedCategoryId}
                  publishPending={publishDemand.isPending}
                  onPublish={() => void handlePublish()}
                  onCancel={() => navigate('/buyer/dashboard')}
                  disablePublish={watchedCities.length === 0}
                />
              </footer>
            }
          >
            {/* Coluna do formulário */}
            <section className={cn(SCROLL_PAGE_SECTION_CLASS)}>
              <div className="space-y-6">
                {categoriesError && (
                  <Alert className="border-destructive/50 text-destructive">Erro ao carregar categorias.</Alert>
                )}
                {formError && (
                  <Alert className="border-destructive/50 text-destructive">{formError}</Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Camisa adulto" {...field} />
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
                          <CategoryPicker
                            categories={categories ?? []}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={loadingCategories}
                            loading={loadingCategories}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prazo_desejado"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 lg:col-span-1">
                        <FormLabel>Prazo desejado</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={formatDateTimeLocalInput(field.value)}
                            onChange={(event) =>
                              field.onChange(parseDateTimeLocalInput(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <textarea
                          className={cn(NATIVE_FIELD_CLASS, 'min-h-[100px] py-2')}
                          placeholder={descricaoPlaceholder}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DemandVariantFields
                  optionSource={productVariantSource}
                  nativeFieldClass={NATIVE_FIELD_CLASS}
                />
              </div>
            </section>

            {/* Painel lateral — altura fixa da viewport, sem empurrar a página */}
            <section className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-sidebar-border max-lg:flex-none lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
              <DemandLocationPanel
                cities={watchedCities}
                onCitiesChange={handleCitiesChange}
                selectedCategory={selectedCategory}
                isSaving={isSaving}
                selectedCategoryId={selectedCategoryId}
                publishPending={publishDemand.isPending}
                onPublish={() => void handlePublish()}
                onCancel={() => navigate('/buyer/dashboard')}
              />
            </section>
          </ScrollPageShell>
        </form>
      </Form>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} quotaType="demands" />
    </>
  )
}
