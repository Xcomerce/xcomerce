import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { demandSchema, type DemandInput } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { fetchAddressByCep, formatCep } from '@/lib/cep'
import { cn } from '@/lib/utils'
import {
  ATTACHMENT_ACCEPT,
  BRAZILIAN_UFS,
  DEMAND_PAGE_HEIGHT_CLASS,
  MAX_ATTACHMENTS,
  NATIVE_FIELD_CLASS,
} from '@/pages/buyer/new-demand/constants'
import { EligibleSuppliersPanel } from '@/pages/buyer/new-demand/EligibleSuppliersPanel'
import { getEligibleSuppliers } from '@/pages/buyer/new-demand/utils'

function DemandPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={cn(DEMAND_PAGE_HEIGHT_CLASS, 'flex w-full flex-col overflow-hidden lg:flex-row')}>
      {children}
    </div>
  )
}

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
  } | null

  const { data: existingDemand, isLoading: loadingDemand, error: demandError } = useDemand(editId)
  const { data: categories, isLoading: loadingCategories, error: categoriesError } = useCategories()
  const createDemand = useCreateDemand()
  const updateDemand = useUpdateDemand()
  const publishDemand = usePublishDemand()

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [cep, setCep] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
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
    },
  })

  const selectedCategoryId = form.watch('category_id')
  const watchedCity = form.watch('cidade')
  const watchedUf = form.watch('uf')
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)
  const eligible = getEligibleSuppliers(selectedCategory?.slug)
  const deliverySummary = [logradouro, numero && `nº ${numero}`, bairro].filter(Boolean).join(', ')
  const isSearchingSidebar = isSearchingSuppliers || cepLoading

  const isSaving =
    createDemand.isPending ||
    updateDemand.isPending ||
    publishDemand.isPending ||
    form.formState.isSubmitting

  useEffect(() => {
    if (isEditing) return
    if (stateData?.categoryId) form.setValue('category_id', stateData.categoryId)
    if (stateData?.title) form.setValue('titulo', stateData.title)
    if (stateData?.description) form.setValue('descricao', stateData.description)
    if (stateData?.city) form.setValue('cidade', stateData.city)
    if (stateData?.uf) form.setValue('uf', stateData.uf)
  }, [stateData, isEditing, form])

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

  useEffect(() => {
    if (!selectedCategoryId) {
      setIsSearchingSuppliers(false)
      return
    }
    setIsSearchingSuppliers(true)
    const timer = window.setTimeout(() => setIsSearchingSuppliers(false), cepLoading ? 1200 : 700)
    return () => window.clearTimeout(timer)
  }, [selectedCategoryId, watchedCity, watchedUf, cepLoading])

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

  async function handleCepLookup(rawCep: string) {
    const digits = rawCep.replace(/\D/g, '')
    if (digits.length !== 8) return

    setCepLoading(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        toast.error('CEP não encontrado')
        return
      }
      form.setValue('cidade', address.cidade, { shouldValidate: true })
      form.setValue('uf', address.uf, { shouldValidate: true })
      if (address.logradouro) setLogradouro(address.logradouro)
      if (address.bairro) setBairro(address.bairro)
      toast.success('Endereço preenchido pelo CEP')
    } catch {
      toast.error('Não foi possível consultar o CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
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
    const valid = await form.trigger()
    if (!valid) return
    const values = form.getValues()
    const id = isEditing && editId ? editId : await saveDraft(values)
    if (!id) return
    try {
      await publishDemand.mutateAsync(id)
      toast.success('Demanda publicada')
      navigate(`/buyer/demands/${id}/auction`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar'
      if (message.includes('quota') || message.includes('QUOTA')) {
        setPaywallOpen(true)
      } else {
        toast.error(translateSupabaseError(message))
      }
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
          <DemandPageShell>
            {/* Coluna do formulário — único scroll */}
            <section className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6">
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

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da demanda</FormLabel>
                      <FormControl>
                        <textarea
                          className={cn(NATIVE_FIELD_CLASS, 'min-h-[100px] py-2')}
                          placeholder="Necessito 500 capacetes de obra com CA válido, cor branca..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
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

                <fieldset className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                  <legend className="px-1 text-sm font-semibold text-foreground">Endereço de entrega</legend>
                  <p className="text-xs text-muted-foreground">
                    Informe o CEP para preencher logradouro, bairro, cidade e estado.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-5">
                      <label htmlFor="demand-cep" className="text-sm font-medium">
                        CEP
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="demand-cep"
                          inputMode="numeric"
                          placeholder="00000-000"
                          value={formatCep(cep)}
                          disabled={cepLoading}
                          onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          onBlur={() => void handleCepLookup(cep)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          disabled={cep.replace(/\D/g, '').length !== 8 || cepLoading}
                          onClick={() => void handleCepLookup(cep)}
                        >
                          {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                      <label htmlFor="demand-numero" className="text-sm font-medium">
                        Número
                      </label>
                      <Input
                        id="demand-numero"
                        placeholder="123"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2 lg:col-span-5">
                      <label htmlFor="demand-bairro" className="text-sm font-medium">
                        Bairro
                      </label>
                      <Input
                        id="demand-bairro"
                        placeholder="Ex.: Centro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2 lg:col-span-12">
                      <label htmlFor="demand-logradouro" className="text-sm font-medium">
                        Logradouro
                      </label>
                      <Input
                        id="demand-logradouro"
                        placeholder="Rua, avenida, rodovia..."
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 lg:col-span-8">
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="uf"
                      render={({ field }) => (
                        <FormItem className="lg:col-span-4">
                          <FormLabel>Estado (UF)</FormLabel>
                          <FormControl>
                            <select className={cn(NATIVE_FIELD_CLASS, 'h-10 uppercase')} {...field}>
                              <option value="">Selecione</option>
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
                </fieldset>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (opcional)</FormLabel>
                      <FormControl>
                        <textarea
                          className={cn(NATIVE_FIELD_CLASS, 'min-h-[80px] py-2')}
                          placeholder="Alguma instrução adicional..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Anexos</FormLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors',
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
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      Arraste documentos aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
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
            </section>

            {/* Painel lateral — altura fixa da viewport, sem empurrar a página */}
            <section className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-sidebar-border max-lg:h-72 lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
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
          </DemandPageShell>
        </form>
      </Form>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} quotaType="demands" />
    </>
  )
}
