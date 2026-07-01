import { useEffect, useState, type DragEvent } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  demandSchema,
  formatBuyerAddressSummary,
  isBuyerAddressComplete,
  type BuyerAddress,
  type BuyerAddressInput,
  type DemandInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { PaywallModal } from '@/components/common/PaywallModal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { DemandVariantFields } from '@/components/buyer/DemandVariantFields'
import { BuyerAddressForm, buyerAddressToDemandLocation } from '@/components/buyer/BuyerAddressForm'
import { usePageTitle } from '@/hooks/use-page-title'
import { useCategories } from '@/hooks/use-categories'
import { useBuyerAddress, useUpdateBuyerAddress } from '@/hooks/use-buyer-address'
import {
  useCreateDemand,
  useDemand,
  usePublishDemand,
  useUpdateDemand,
} from '@/hooks/use-demands'
import { translateSupabaseError, formatSupabaseError, isQuotaExceededError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ScrollPageShell, SCROLL_PAGE_SECTION_CLASS } from '@/components/layout/ScrollPageShell'
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  NATIVE_FIELD_CLASS,
} from '@/pages/buyer/new-demand/constants'
import { DemandFormActions } from '@/pages/buyer/new-demand/DemandFormActions'
import { EligibleSuppliersPanel } from '@/pages/buyer/new-demand/EligibleSuppliersPanel'
import { getEligibleSuppliers } from '@/pages/buyer/new-demand/utils'

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
  const { data: buyerAddress, isLoading: loadingBuyerAddress } = useBuyerAddress()
  const updateBuyerAddress = useUpdateBuyerAddress()

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [displayAddress, setDisplayAddress] = useState<Partial<BuyerAddress> | null>(null)
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

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
      cor: '',
      tamanho: '',
    },
  })

  const selectedCategoryId = form.watch('category_id')
  const watchedCity = form.watch('cidade')
  const watchedUf = form.watch('uf')
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)
  const eligible = getEligibleSuppliers(selectedCategory?.slug)
  const savedAddress = displayAddress ?? buyerAddress
  const hasCompleteAddress = isBuyerAddressComplete(savedAddress)
  const deliverySummary = savedAddress ? formatBuyerAddressSummary(savedAddress) : undefined
  const isSearchingSidebar = isSearchingSuppliers

  const isSaving =
    createDemand.isPending ||
    updateDemand.isPending ||
    publishDemand.isPending ||
    updateBuyerAddress.isPending ||
    form.formState.isSubmitting

  useEffect(() => {
    if (isEditing) return
    if (stateData?.categoryId) form.setValue('category_id', stateData.categoryId)
    if (stateData?.title) form.setValue('titulo', stateData.title)
    if (stateData?.description) form.setValue('descricao', stateData.description)
    if (stateData?.city) form.setValue('cidade', stateData.city)
    if (stateData?.uf) form.setValue('uf', stateData.uf)
    if (stateData?.precoReferencia != null && stateData.precoReferencia > 0) {
      form.setValue('preco_referencia_mercado', stateData.precoReferencia)
    }
  }, [stateData, isEditing, form])

  useEffect(() => {
    if (buyerAddress) {
      setDisplayAddress(buyerAddress)
    }
  }, [buyerAddress])

  useEffect(() => {
    if (!savedAddress || !hasCompleteAddress || isEditing) return
    const location = buyerAddressToDemandLocation(savedAddress as BuyerAddress)
    if (!stateData?.city) form.setValue('cidade', location.cidade, { shouldValidate: true })
    if (!stateData?.uf) form.setValue('uf', location.uf, { shouldValidate: true })
  }, [savedAddress, hasCompleteAddress, isEditing, stateData, form])

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
      preco_referencia_mercado: existingDemand.preco_referencia_mercado ?? undefined,
      cor: existingDemand.cor ?? '',
      tamanho: existingDemand.tamanho ?? '',
    })
  }, [existingDemand, form])

  useEffect(() => {
    if (!selectedCategoryId) {
      setIsSearchingSuppliers(false)
      return
    }
    setIsSearchingSuppliers(true)
    const timer = window.setTimeout(() => setIsSearchingSuppliers(false), 700)
    return () => window.clearTimeout(timer)
  }, [selectedCategoryId, watchedCity, watchedUf])

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
    navigate('/buyer/dashboard')
  }

  async function handleSaveAddress(input: BuyerAddressInput) {
    try {
      const saved = await updateBuyerAddress.mutateAsync(input)
      setDisplayAddress(saved)
      const location = buyerAddressToDemandLocation(input)
      form.setValue('cidade', location.cidade, { shouldValidate: true })
      form.setValue('uf', location.uf, { shouldValidate: true })
      toast.success('Endereço de entrega salvo')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar endereço'))
      throw err
    }
  }

  function addAttachmentFiles(files: FileList | File[]) {
    const incoming = Array.from(files)
    if (incoming.length === 0) return
    setAttachments((prev) => {
      const merged = [...prev, ...incoming]
      if (merged.length > MAX_ATTACHMENTS) {
        toast.error(`Máximo de ${MAX_ATTACHMENTS} anexos`)
        return merged.slice(0, MAX_ATTACHMENTS)
      }
      return merged
    })
  }

  function handleAttachmentDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    addAttachmentFiles(e.dataTransfer.files)
  }

  async function handlePublish() {
    if (!hasCompleteAddress) {
      toast.error('Complete seu endereço de entrega para publicar a demanda')
      return
    }
    const valid = await form.trigger()
    if (!valid) return
    const values = form.getValues()
    const id = isEditing && editId ? editId : await saveDraft(values)
    if (!id) return
    try {
      await publishDemand.mutateAsync(id)
      toast.success('Demanda publicada')
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
          Não foi possível carregar a demanda para edição.
        </Alert>
      </div>
    )
  }

  if (isEditing && existingDemand && existingDemand.status !== 'RASCUNHO') {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Alert>Esta demanda não pode mais ser editada.</Alert>
        <Button asChild variant="outline">
          <Link to={`/buyer/demands/${existingDemand.id}`}>Ver demanda</Link>
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título da demanda</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Parafusos inox M8" {...field} />
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
                            className={cn(NATIVE_FIELD_CLASS, 'h-10')}
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
                </div>

                <div className="flex flex-col gap-6">
                  <div className="contents lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem className="order-1 flex h-full flex-col">
                          <FormLabel>Descrição da demanda</FormLabel>
                          <FormControl>
                            <textarea
                              className={cn(NATIVE_FIELD_CLASS, 'min-h-[100px] flex-1 py-2 lg:min-h-[120px]')}
                              placeholder="Descreva o produto, quantidade, certificações e demais requisitos..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="order-4 flex h-full flex-col gap-3 lg:order-none">
                      <FormLabel>Anexos</FormLabel>
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'flex min-h-[100px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-center transition-colors lg:min-h-[120px]',
                          isDragOver && 'border-primary bg-primary/5',
                        )}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          setIsDragOver(true)
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragOver(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          if (e.currentTarget === e.target) setIsDragOver(false)
                        }}
                        onDrop={handleAttachmentDrop}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            document.getElementById('demand-attachments-input')?.click()
                          }
                        }}
                        onClick={() => document.getElementById('demand-attachments-input')?.click()}
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium leading-tight text-foreground">
                          Arraste documentos aqui ou clique para selecionar
                        </p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          PDF, imagens ou planilhas — até {MAX_ATTACHMENTS} arquivos
                        </p>
                        <input
                          id="demand-attachments-input"
                          type="file"
                          multiple
                          accept={ATTACHMENT_ACCEPT}
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files) addAttachmentFiles(e.target.files)
                            e.target.value = ''
                          }}
                        />
                      </div>
                      {attachments.length > 0 && (
                        <ul className="flex flex-wrap gap-3">
                          {attachments.map((file, index) => (
                            <li
                              key={`${file.name}-${file.size}-${index}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-sm"
                            >
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="max-w-[200px] truncate">{file.name}</span>
                              <button
                                type="button"
                                className="rounded-md p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                aria-label={`Remover ${file.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                <div className="order-2 grid gap-4 sm:grid-cols-3 lg:order-none">
                  <div className="space-y-2">
                    <FormLabel>Quantidade</FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="quantidade"
                        render={({ field }) => (
                          <FormItem className="w-2/3">
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
                          <FormItem className="w-1/3">
                            <FormControl>
                              <Input placeholder="UN" {...field} className="uppercase" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:contents">
                    <FormField
                      control={form.control}
                      name="prazo_desejado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo desejado</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>
                </div>

                <DemandVariantFields
                  control={form.control}
                  corName="cor"
                  tamanhoName="tamanho"
                  optionSource={productVariantSource}
                  nativeFieldClass={NATIVE_FIELD_CLASS}
                />

                <div className="order-3 lg:order-none">
                {loadingBuyerAddress ? (
                  <LoadingSkeleton className="h-40 w-full rounded-xl" />
                ) : (
                  <BuyerAddressForm
                    idPrefix="demand-address"
                    value={savedAddress ?? undefined}
                    readOnly={hasCompleteAddress}
                    requiredHint={
                      !hasCompleteAddress
                        ? 'Complete seu endereço de entrega para continuar. Ele será salvo como padrão para próximas solicitações.'
                        : undefined
                    }
                    saving={updateBuyerAddress.isPending}
                    onSave={handleSaveAddress}
                    onAddressChange={(address) => {
                      setDisplayAddress(address)
                      if (isBuyerAddressComplete(address)) {
                        const location = buyerAddressToDemandLocation(address)
                        form.setValue('cidade', location.cidade, { shouldValidate: true })
                        form.setValue('uf', location.uf, { shouldValidate: true })
                      }
                    }}
                  />
                )}
                </div>

                </div>
              </div>
            </section>

            {/* Painel lateral — altura fixa da viewport, sem empurrar a página */}
            <section className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-sidebar-border max-lg:flex-none lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
              <EligibleSuppliersPanel
                eligible={eligible}
                selectedCategory={selectedCategory}
                watchedCity={watchedCity}
                watchedUf={watchedUf}
                deliverySummary={deliverySummary || undefined}
                isSaving={isSaving}
                selectedCategoryId={selectedCategoryId}
                isSearching={isSearchingSidebar}
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
