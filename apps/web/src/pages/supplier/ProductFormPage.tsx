import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { getLeafCategories, getProductImageUrls, productSchema, parseVariantStockRows, type ProductInput } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PaywallModal } from '@/components/common/PaywallModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { AutocompleteSelect } from '@/components/ui/searchable-select'
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
import { cn } from '@/lib/utils'

import { ProductVariantsSection } from '@/components/catalog/ProductVariantsSection'
import { SupplierStoreNameField } from '@/components/supplier/SupplierStoreNameField'

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PRODUCT_IMAGE_MIN_DIMENSION = 800

const PRODUCT_IMAGE_MAX_COUNT = 8

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
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const { data: product, isLoading: productLoading } = useProduct(isEdit ? id : undefined)
  const { data: categories = [] } = useCategories()
  const { data: onboardingState } = useOnboardingState()
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const limit = subscription?.plan?.max_catalog_items ?? null
  const atLimit = !isEdit && limit !== null && count >= limit

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
      tem_cor: false,
      tem_tamanho: false,
      tipo_tamanho: null,
      cores: [],
      tamanhos: [],
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
  const isSaving = form.formState.isSubmitting || createProduct.isPending || updateProduct.isPending

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
        tem_cor: product.tem_cor ?? false,
        tem_tamanho: product.tem_tamanho ?? false,
        tipo_tamanho: product.tipo_tamanho ?? null,
        cores: product.cores ?? [],
        tamanhos: product.tamanhos ?? [],
        estoque_variacoes: parseVariantStockRows(product.estoque_variacoes),
      })
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

  async function onSubmit(values: ProductInput) {
    if (!isEdit && atLimit) {
      setPaywallOpen(true)
      return
    }

    if (!supplierLocation) {
      toast.error('Configure o endereço da empresa no onboarding antes de salvar o produto.')
      return
    }

    const payload: ProductInput = {
      ...values,
      cidade: supplierLocation.cidade,
      uf: supplierLocation.uf,
    }

    try {
      if (isEdit && id) {
        await updateProduct.mutateAsync({ id, input: payload })
        const uploaded = await uploadProductImages(id, pendingImages.map((item) => item.file))
        await updateProductImages(id, [...savedImageUrls, ...uploaded])
        toast.success('Produto atualizado')
      } else {
        const created = await createProduct.mutateAsync(payload)
        const uploaded = await uploadProductImages(created.id, pendingImages.map((item) => item.file))
        if (uploaded.length > 0) {
          await updateProductImages(created.id, uploaded)
        }
        toast.success('Produto criado')
      }
      navigate('/supplier/catalog')
    } catch (err) {
      const msg = formatSupabaseError(err)
      if (msg.includes('QUOTA') || msg.includes('quota') || msg.includes('Limite do plano')) {
        setPaywallOpen(true)
      } else {
        toast.error(msg)
      }
    }
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

  function removePendingImage(id: string) {
    setPendingImages((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((item) => item.id !== id)
    })
  }

  function handleImageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    addImageFiles(Array.from(e.dataTransfer.files))
  }

  if (isEdit && productLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(220px,320px)_1fr]">
            <LoadingSkeleton className="aspect-square w-full max-w-sm rounded-xl" />
            <LoadingSkeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isEdit && !productLoading && !product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button className="mt-4" asChild>
          <Link to="/supplier/catalog">Voltar ao catálogo</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-4 lg:p-6">
        <div className="w-full space-y-4">
          {!isEdit && (
            <div className="flex justify-end">
              <QuotaBadge used={count} limit={limit} label="Catálogo" />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(220px,320px)_1fr] lg:items-start">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Imagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={cn(
                'rounded-xl border border-dashed p-3 transition-colors',
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
              onDrop={handleImageDrop}
            >
              {totalImages > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {savedImageUrls.map((url) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSavedImage(url)}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm"
                        aria-label="Remover imagem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {pendingImages.map((item) => (
                    <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePendingImage(item.id)}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm"
                        aria-label="Remover imagem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-xl bg-muted lg:max-w-none">
                  <ImagePlus className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              {totalImages < PRODUCT_IMAGE_MAX_COUNT ? (
                <label className="mt-3 flex cursor-pointer flex-col items-center gap-2">
                  <input
                    type="file"
                    accept={PRODUCT_IMAGE_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addImageFiles(Array.from(e.target.files ?? []))
                      e.target.value = ''
                    }}
                  />
                  <span className="text-sm font-medium text-primary">
                    {totalImages > 0 ? 'Adicionar mais imagens' : 'Selecionar ou arrastar imagens'}
                  </span>
                </label>
              ) : null}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Até {PRODUCT_IMAGE_MAX_COUNT} imagens · JPEG, PNG ou WebP · 5 MB cada · recomendado{' '}
              {PRODUCT_IMAGE_MIN_DIMENSION}×{PRODUCT_IMAGE_MIN_DIMENSION} px
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <SupplierStoreNameField />
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                      <FormLabel>SKU</FormLabel>
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Opcional"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preco_referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Valor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ProductVariantsSection />
            </form>
          </Form>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:px-6">
        {isEdit ? (
          <>
            <Button
              type="submit"
              form="product-form"
              className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar produto'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 rounded-xl border border-destructive/20 bg-destructive/10 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive lg:order-1 lg:w-auto"
              disabled={deleteProduct.isPending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              {deleteProduct.isPending ? 'Excluindo...' : 'Excluir produto'}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              form="product-form"
              className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar produto'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-xl lg:hidden"
              onClick={() => navigate('/supplier/catalog')}
            >
              Cancelar
            </Button>
          </>
        )}
      </footer>

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
    </div>
  )
}
