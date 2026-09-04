import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getLeafCategories, getProductImageUrls, productSchema, parseVariantStockRows, type ProductInput } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PaywallModal } from '@/components/common/PaywallModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { AutocompleteSelect } from '@/components/ui/searchable-select'
import { ScrollPageShell, SCROLL_PAGE_SECTION_CLASS } from '@/components/layout/ScrollPageShell'
import { UnitPriceInput } from '@/components/supplier/UnitPriceInput'
import { ProductVariantsSection } from '@/components/catalog/ProductVariantsSection'
import { ProductFormSection } from '@/pages/supplier/product-form/ProductFormSection'
import { ProductFormSidebar } from '@/pages/supplier/product-form/ProductFormSidebar'
import { ProductFormActions } from '@/pages/supplier/product-form/ProductFormActions'
import { computeProductFormSummary } from '@/pages/supplier/product-form/utils'
import { getProductPublishMissingFields } from '@/pages/supplier/product-form/validation'
import {
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useProductCount,
  useUpdateProduct,
} from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useOnboardingState } from '@/hooks/use-onboarding'
import { useSubscription } from '@/hooks/use-billing'
import { useAuth } from '@/contexts/auth-context'
import { updateProductImages } from '@/services/products'
import type { OnboardingState } from '@/services/onboarding'
import { uploadFile, productImagePath } from '@/lib/storage'
import { formatSupabaseError, translateSupabaseError } from '@/lib/errors'
import {
  buildProductAbandonedKey,
  trackDiagnosticEvent,
} from '@/lib/diagnostics'
import { cn } from '@/lib/utils'
import { CATALOG_LIMITS_ENABLED } from '@/config/features'

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PRODUCT_IMAGE_MAX_COUNT = 8
const DESCRIPTION_MAX_LENGTH = 1000

const NATIVE_FIELD_CLASS =
  'flex w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type PendingProductImage = {
  id: string
  file: File
  preview: string
}

function isProductFormReady(values: ProductInput): boolean {
  return productSchema.safeParse(values).success
}

function getSupplierDefaultLocation(
  state: OnboardingState | undefined,
): { cidade: string; uf: string } | null {
  if (!state) return null

  const cidade = state.profile?.service_city?.trim() || state.company?.cidade?.trim()
  const uf = state.profile?.service_uf?.trim() || state.company?.uf?.trim()

  if (!cidade || !uf) return null

  return { cidade, uf: uf.toUpperCase() }
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [savedImageUrls, setSavedImageUrls] = useState<string[]>([])
  const [draftId, setDraftId] = useState<string | undefined>(id)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedAtRef = useRef(Date.now())
  const publishedRef = useRef(false)
  const furthestStepRef = useRef(1)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([])

  const { data: product, isLoading: productLoading } = useProduct(isEdit ? id : undefined)
  const { data: categories = [] } = useCategories()
  const { data: onboardingState } = useOnboardingState()
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const limit = CATALOG_LIMITS_ENABLED ? (subscription?.plan?.max_catalog_items ?? null) : null
  const atLimit = CATALOG_LIMITS_ENABLED && !isEdit && limit !== null && count >= limit

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: '',
      category_id: '',
      sku: '',
      descricao: '',
      marca: '',
      cidade: '',
      uf: '',
      is_active: true,
      is_draft: false,
      tem_cor: false,
      tem_tamanho: false,
      tipo_tamanho: null,
      cores: [],
      tamanhos: [],
      variant_axes: [],
      estoque_variacoes: [],
    },
  })

  const supplierLocation = useMemo(
    () => getSupplierDefaultLocation(onboardingState),
    [onboardingState],
  )

  const leafCategories = useMemo(() => getLeafCategories(categories), [categories])

  const categoryOptions = useMemo(
    () => leafCategories.map((category) => ({ value: category.id, label: category.name })),
    [leafCategories],
  )

  const formValues = form.watch()
  const canSave = isProductFormReady(formValues)
  const missingFields = useMemo(() => getProductPublishMissingFields(formValues), [formValues])
  const isSaving = form.formState.isSubmitting || createProduct.isPending || updateProduct.isPending
  const summary = useMemo(() => computeProductFormSummary(formValues), [formValues])

  const previewImageUrl = pendingImages[0]?.preview ?? savedImageUrls[0] ?? null
  const previewItems = useMemo(() => {
    const cores = formValues.tem_cor ? (formValues.cores ?? []) : []
    if (cores.length > 0) {
      return cores.map((cor) => ({
        key: cor,
        label: cor,
        imageUrl: previewImageUrl,
      }))
    }
    return previewImageUrl
      ? [{ key: 'default', label: 'Produto', imageUrl: previewImageUrl }]
      : []
  }, [formValues.tem_cor, formValues.cores, previewImageUrl])

  useEffect(() => {
    let step = 1
    if ((formValues.variant_axes?.length ?? 0) > 0 || formValues.tem_cor || formValues.tem_tamanho) {
      step = 2
    }
    if (pendingImages.length > 0 || savedImageUrls.length > 0) {
      step = 3
    }
    furthestStepRef.current = Math.max(furthestStepRef.current, step)
  }, [formValues, pendingImages.length, savedImageUrls.length])

  useEffect(() => {
    return () => {
      if (publishedRef.current) return
      const elapsed = Date.now() - mountedAtRef.current
      if (elapsed < 5000) return
      const isDraftProduct =
        (product as { is_draft?: boolean } | undefined)?.is_draft ?? !isEdit
      if (!isDraftProduct && isEdit) return

      void trackDiagnosticEvent(
        'product_form_abandoned',
        buildProductAbandonedKey(furthestStepRef.current),
        {
          step: furthestStepRef.current,
          product_id: draftId ?? id ?? null,
        },
        { userRole: 'supplier', dedupeMs: 120_000 },
      )
    }
  }, [draftId, id, isEdit, product])

  useEffect(() => {
    if (product) {
      form.reset({
        nome: product.nome,
        category_id: product.category_id,
        sku: product.sku ?? '',
        descricao: product.descricao ?? '',
        marca: product.marca ?? '',
        preco_referencia: product.preco_referencia ?? undefined,
        cidade: supplierLocation?.cidade ?? '',
        uf: supplierLocation?.uf ?? '',
        is_active: product.is_active,
        is_draft: (product as { is_draft?: boolean }).is_draft ?? false,
        tem_cor: product.tem_cor ?? false,
        tem_tamanho: product.tem_tamanho ?? false,
        tipo_tamanho: product.tipo_tamanho ?? null,
        cores: product.cores ?? [],
        tamanhos: product.tamanhos ?? [],
        variant_axes: (product as { variant_axes?: ProductInput['variant_axes'] }).variant_axes ?? [],
        estoque_variacoes: parseVariantStockRows(product.estoque_variacoes),
      })
      setDraftId(product.id)
      setSavedImageUrls(getProductImageUrls(product))
      setPendingImages([])
    }
  }, [product, form, supplierLocation])

  useEffect(() => {
    if (product || !supplierLocation) return
    form.setValue('cidade', supplierLocation.cidade, { shouldValidate: true })
    form.setValue('uf', supplierLocation.uf, { shouldValidate: true })
  }, [product, supplierLocation, form])

  useEffect(() => {
    if (!isEdit && atLimit) setPaywallOpen(true)
  }, [isEdit, atLimit])

  async function uploadProductImages(productId: string, files: File[]): Promise<string[]> {
    if (!user || files.length === 0) return []

    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = productImagePath(user.id, productId, ext, `${Date.now()}-${uploaded.length}`)
      const url = await uploadFile('product-images', path, file)
      uploaded.push(url)
    }
    return uploaded
  }

  async function confirmDelete() {
    if (!id || !product) return
    try {
      await deleteProduct.mutateAsync(id)
      toast.success('Produto removido')
      setDeleteDialogOpen(false)
      navigate('/supplier/catalog')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao remover'))
    }
  }

  async function persistProduct(values: ProductInput, publish: boolean, silent = false) {
    if (!isEdit && !values.is_draft && atLimit && publish) {
      setPaywallOpen(true)
      return false
    }

    if (!supplierLocation) {
      toast.error('Configure o endereço da empresa no onboarding antes de salvar o produto.')
      return false
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const payload: ProductInput = {
      ...values,
      cidade: supplierLocation.cidade,
      uf: supplierLocation.uf,
      is_active: publish,
      is_draft: !publish,
      draft_expires_at: publish ? null : expiresAt.toISOString(),
    }

    try {
      const targetId = draftId ?? id
      if (targetId) {
        await updateProduct.mutateAsync({ id: targetId, input: payload })
        const uploaded = await uploadProductImages(targetId, pendingImages.map((item) => item.file))
        if (uploaded.length > 0) {
          await updateProductImages(targetId, [...savedImageUrls, ...uploaded])
        }
        if (!silent) toast.success(publish ? 'Produto publicado' : 'Rascunho salvo')
      } else {
        const created = await createProduct.mutateAsync(payload)
        setDraftId(created.id)
        const uploaded = await uploadProductImages(created.id, pendingImages.map((item) => item.file))
        if (uploaded.length > 0) {
          await updateProductImages(created.id, uploaded)
        }
        if (!silent) toast.success(publish ? 'Produto publicado' : 'Rascunho salvo')
      }
      if (publish) {
        publishedRef.current = true
        navigate('/supplier/catalog')
      } else setDraftSavedAt(new Date())
      return true
    } catch (err) {
      const msg = formatSupabaseError(err)
      if (msg.includes('QUOTA') || msg.includes('quota') || msg.includes('Limite do plano')) {
        setPaywallOpen(true)
      } else {
        toast.error(msg)
      }
      return false
    }
  }

  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) return
    await persistProduct(form.getValues(), true)
  }

  async function handleSaveDraft() {
    await persistProduct(form.getValues(), false)
  }

  useEffect(() => {
    if (isEdit && product && !product.is_active && !(product as { is_draft?: boolean }).is_draft) return
    const nome = formValues.nome?.trim()
    if (!nome || nome.length < 2) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      void persistProduct({ ...form.getValues(), is_draft: true, is_active: false }, false, true)
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [formValues, isEdit, product])

  useEffect(() => {
    const expiresAt = (product as { draft_expires_at?: string | null })?.draft_expires_at
    if (!expiresAt) return
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft === 7 || daysLeft === 1) {
      toast.warning(`Este rascunho expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.`)
    }
  }, [product])

  async function onSubmit(values: ProductInput) {
    await persistProduct(values, true)
  }

  const totalImages = savedImageUrls.length + pendingImages.length

  function addImageFiles(files: File[]) {
    const allowedTypes = PRODUCT_IMAGE_ACCEPT.split(',')
    const remaining = PRODUCT_IMAGE_MAX_COUNT - totalImages
    if (remaining <= 0) {
      toast.error(`Máximo de ${PRODUCT_IMAGE_MAX_COUNT} imagens por produto`)
      return
    }

    const validFiles = files
      .filter((file) => allowedTypes.includes(file.type))
      .filter((file) => file.size <= PRODUCT_IMAGE_MAX_BYTES)
      .slice(0, remaining)

    if (validFiles.length === 0) {
      toast.error('Use JPEG, PNG ou WebP de até 5 MB')
      return
    }

    if (validFiles.length < files.length) {
      toast.error(`Algumas imagens foram ignoradas (limite de ${PRODUCT_IMAGE_MAX_COUNT} ou formato inválido)`)
    }

    setPendingImages((current) => [
      ...current,
      ...validFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
  }

  function removeSavedImage(url: string) {
    setSavedImageUrls((current) => current.filter((item) => item !== url))
  }

  function removePendingImage(imageId: string) {
    setPendingImages((current) => {
      const target = current.find((item) => item.id === imageId)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((item) => item.id !== imageId)
    })
  }

  if (isEdit && productLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    )
  }

  if (isEdit && !productLoading && !product) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button className="mt-4" asChild>
          <Link to="/supplier/catalog">Voltar ao catálogo</Link>
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
                <ProductFormActions
                  isSaving={isSaving}
                canSave={canSave}
                isEdit={isEdit}
                isDeleting={deleteProduct.isPending}
                missingFields={missingFields}
                isDraft={(product as { is_draft?: boolean })?.is_draft ?? !isEdit}
                onPublish={() => void handlePublish()}
                onSaveDraft={() => void handleSaveDraft()}
                onDelete={isEdit ? () => setDeleteDialogOpen(true) : undefined}
                onCancel={() => navigate('/supplier/catalog')}
              />
              {draftSavedAt ? (
                <p className="px-3 pb-2 text-center text-[11px] text-muted-foreground">
                  Rascunho salvo às {draftSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : null}
              </footer>
            }
          >
            <section className={cn(SCROLL_PAGE_SECTION_CLASS, 'max-w-4xl xl:max-w-none')}>
              <div className="mx-auto w-full max-w-3xl space-y-6">
                <header className="space-y-1">
                  <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    {isEdit ? 'Editar produto' : 'Novo produto'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Preencha as informações para exibir seu produto no catálogo e receber pedidos de
                    compradores.
                  </p>
                </header>

                <ProductFormSection
                  step={1}
                  title="Informações básicas"
                  description="Dados principais do produto visíveis no anúncio."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel required>Nome do produto</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: Camiseta Básica 100% Algodão" {...field} />
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
                          <FormLabel required>Categoria</FormLabel>
                          <FormControl>
                            <AutocompleteSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={categoryOptions}
                              placeholder="Digite para buscar categoria..."
                              emptyMessage="Nenhuma categoria encontrada"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Opcional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código do produto</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Identificador geral do item no seu catálogo (ex.: CAM-BAS-001).
                          </p>
                          <FormControl>
                            <Input placeholder="Opcional" {...field} />
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
                        <FormLabel>Descrição do produto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <textarea
                              className={cn(NATIVE_FIELD_CLASS, 'min-h-[120px] resize-y py-2.5')}
                              placeholder="Descreva materiais, acabamento, indicações de uso..."
                              maxLength={DESCRIPTION_MAX_LENGTH}
                              {...field}
                            />
                            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                              {(field.value?.length ?? 0)}/{DESCRIPTION_MAX_LENGTH}
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </ProductFormSection>

                <ProductFormSection
                  step={2}
                  title="Variações e estoque"
                  description="Configure variações, imagens e estoque por combinação."
                >
                  <ProductVariantsSection
                    categoryId={formValues.category_id}
                    savedImageUrls={savedImageUrls}
                    pendingImages={pendingImages}
                    totalImages={totalImages}
                    maxImages={PRODUCT_IMAGE_MAX_COUNT}
                    onAddImages={addImageFiles}
                    onRemoveSavedImage={removeSavedImage}
                    onRemovePendingImage={removePendingImage}
                  />
                </ProductFormSection>

                <ProductFormSection
                  step={3}
                  title="Preço e configuração"
                  description="Defina o valor de referência exibido no catálogo."
                >
                  <FormField
                    control={form.control}
                    name="preco_referencia"
                    render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel required>Preço unitário sugerido</FormLabel>
                        <FormControl>
                          <UnitPriceInput
                            value={typeof field.value === 'number' ? field.value : 0}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </ProductFormSection>
              </div>
            </section>

            <section className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-sidebar-border max-lg:flex-none lg:w-80 lg:border-l lg:border-t-0 xl:w-[22rem]">
              <ProductFormSidebar
                productName={formValues.nome}
                price={
                  typeof formValues.preco_referencia === 'number'
                    ? formValues.preco_referencia
                    : null
                }
                previewItems={previewItems}
                summary={summary}
                isSaving={isSaving}
                canSave={canSave}
                isEdit={isEdit}
                isDeleting={deleteProduct.isPending}
                missingFields={missingFields}
                isDraft={(product as { is_draft?: boolean })?.is_draft ?? !isEdit}
                showQuota={!isEdit}
                quotaUsed={count}
                quotaLimit={limit}
                onPublish={() => void handlePublish()}
                onSaveDraft={() => void handleSaveDraft()}
                onDelete={isEdit ? () => setDeleteDialogOpen(true) : undefined}
                onCancel={() => navigate('/supplier/catalog')}
              />
            </section>
          </ScrollPageShell>
        </form>
      </Form>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} quotaType="catalog" />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => void confirmDelete()}
        title="Excluir produto"
        description={`Remover "${product?.nome ?? 'este produto'}" do catálogo? Essa ação não poderá ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleteProduct.isPending}
      />
    </>
  )
}
