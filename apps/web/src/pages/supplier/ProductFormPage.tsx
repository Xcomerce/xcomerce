import { useEffect, useMemo, useState, type DragEvent, type SyntheticEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { productSchema, type ProductInput } from '@keve/shared'
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
import { updateProductImage } from '@/services/products'
import type { OnboardingState } from '@/services/onboarding'
import { uploadFile, productImagePath } from '@/lib/storage'
import { formatSupabaseError, translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

import { ProductVariantsSection } from '@/components/catalog/ProductVariantsSection'

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PRODUCT_IMAGE_MIN_DIMENSION = 800

type ProductImageMeta = {
  width?: number
  height?: number
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Não foi possível ler a imagem'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<ProductImageMeta | null>(null)
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
    },
  })

  const supplierLocation = useMemo(
    () => getSupplierDefaultLocation(onboardingState),
    [onboardingState],
  )

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories],
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
      })
      if (product.image_url) {
        setImagePreview(product.image_url)
        setImageMeta(null)
      }
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

  async function uploadProductImage(productId: string, file: File) {
    if (!user) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = productImagePath(user.id, productId, ext)
    const url = await uploadFile('product-images', path, file)
    await updateProductImage(productId, url)
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
        if (imageFile) await uploadProductImage(id, imageFile)
        toast.success('Produto atualizado')
      } else {
        const created = await createProduct.mutateAsync(payload)
        if (imageFile) await uploadProductImage(created.id, imageFile)
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

  function handleImageChange(file: File | null) {
    if (!file) return

    const allowedTypes = PRODUCT_IMAGE_ACCEPT.split(',')
    if (!allowedTypes.includes(file.type)) {
      toast.error('Use JPEG, PNG ou WebP')
      return
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      toast.error('A imagem deve ter no máximo 5 MB')
      return
    }

    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setImageMeta(null)

    void readImageDimensions(file)
      .then(({ width, height }) => {
        setImageMeta({ width, height })
      })
      .catch(() => {
        toast.error('Não foi possível ler as dimensões da imagem')
      })
  }

  function handlePreviewLoad(e: SyntheticEvent<HTMLImageElement>) {
    if (imageFile) return
    const { naturalWidth, naturalHeight } = e.currentTarget
    setImageMeta((prev) => ({ ...prev, width: naturalWidth, height: naturalHeight }))
  }

  function handleImageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const allowedTypes = PRODUCT_IMAGE_ACCEPT.split(',')
    const file = Array.from(e.dataTransfer.files).find((f) => allowedTypes.includes(f.type))
    if (file) handleImageChange(file)
  }

  const minDimension =
    imageMeta?.width && imageMeta?.height
      ? Math.min(imageMeta.width, imageMeta.height)
      : null
  const isLowResolution = minDimension !== null && minDimension < PRODUCT_IMAGE_MIN_DIMENSION

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
            <CardTitle className="text-base">Imagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center gap-3">
              <div
                className={cn(
                  'flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border bg-muted transition-colors lg:max-w-none',
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
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt=""
                    className="h-full w-full object-cover"
                    onLoad={handlePreviewLoad}
                  />
                ) : (
                  <ImagePlus className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <input
                type="file"
                accept={PRODUCT_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
              <span className="text-sm font-medium text-primary">Selecionar ou arrastar uma imagem</span>
            </label>

            <p className="text-center text-xs text-muted-foreground">
              JPEG, PNG ou WebP · até 5 MB · recomendado {PRODUCT_IMAGE_MIN_DIMENSION}×
              {PRODUCT_IMAGE_MIN_DIMENSION} px ou maior, proporção 1:1
            </p>

            {isLowResolution && (
              <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-500">
                <p className="font-medium">Melhore a qualidade da imagem</p>
                <p>
                  Para deixar seu produto mais nítido no catálogo, recomendamos usar uma imagem com pelo
                  menos {PRODUCT_IMAGE_MIN_DIMENSION} × {PRODUCT_IMAGE_MIN_DIMENSION} px. Você pode continuar
                  com esta imagem.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
