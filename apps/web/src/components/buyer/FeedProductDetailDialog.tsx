import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, ChevronLeft, ChevronRight, MapPin, Package, Star, Store, X } from 'lucide-react'
import {
  getProductImageUrls,
  getSupplierStoreDisplayName,
  parseVariantStockRows,
  buildVariantStockMatrix,
  type ProductVariantStockRow,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedProduct } from '@/services/products'
import {
  buildDemandStateFromProduct,
  type FeedProductVariantSelection,
} from '@/lib/feed-product-demand'
import { formatFeedProductCurrency, getFeedProductImage } from '@/components/buyer/FeedProductCard'

type FeedProductDetailDialogProps = {
  product: FeedProduct | null
  onClose: () => void
}

function variantStockKey(cor: string | null, tamanho: string | null): string {
  return `${cor ?? ''}|${tamanho ?? ''}`
}

function formatAvailability(row: ProductVariantStockRow): string {
  if (row.ilimitado) return 'Ilimitado'
  if (row.quantidade == null) return 'Disponível'
  if (row.quantidade > 0) return `${row.quantidade} un.`
  return 'Indisponível'
}

function isVariantAvailable(row: ProductVariantStockRow): boolean {
  if (row.ilimitado) return true
  if (row.quantidade == null) return true
  return row.quantidade > 0
}

function orderVariantValues(preferred: string[], values: string[]): string[] {
  const valueSet = new Set(values)
  const ordered = preferred.filter((value) => valueSet.has(value))
  values.forEach((value) => {
    if (!ordered.includes(value)) ordered.push(value)
  })
  return ordered
}

type VariantPickersProps = {
  product: FeedProduct
  variantRows: ProductVariantStockRow[]
  colorOptions: string[]
  sizeOptions: string[]
  selectedCor: string | null
  selectedTamanho: string | null
  onSelectCor: (cor: string) => void
  onSelectTamanho: (tamanho: string) => void
  layout: 'mobile' | 'desktop'
}

function VariantPickers({
  product,
  variantRows,
  colorOptions,
  sizeOptions,
  selectedCor,
  selectedTamanho,
  onSelectCor,
  onSelectTamanho,
  layout,
}: VariantPickersProps) {
  const isMobile = layout === 'mobile'
  const horizontalScrollClass =
    '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar scroll-px-4 scroll-smooth'
  const desktopWrapClass = 'flex flex-wrap gap-2'

  function findRow(cor: string | null, tamanho: string | null) {
    return variantRows.find(
      (row) => variantStockKey(row.cor, row.tamanho) === variantStockKey(cor, tamanho),
    )
  }

  return (
    <div className={cn('space-y-3', isMobile ? 'sm:hidden' : 'hidden sm:block')}>
      {product.tem_cor ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Cor</p>
          <div className={isMobile ? horizontalScrollClass : desktopWrapClass}>
            {colorOptions.map((cor) => {
              const rowsForColor = variantRows.filter((row) => row.cor === cor)
              const anyAvailable = rowsForColor.some(isVariantAvailable)
              const selected = selectedCor === cor
              return (
                <button
                  key={cor}
                  type="button"
                  disabled={!anyAvailable}
                  onClick={() => onSelectCor(cor)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background text-foreground hover:bg-muted/30',
                    !anyAvailable && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {cor}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {product.tem_tamanho ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tamanho</p>
          <div className={isMobile ? horizontalScrollClass : desktopWrapClass}>
            {sizeOptions.map((tamanho) => {
              const row = findRow(product.tem_cor ? selectedCor : null, tamanho)
              const available = row ? isVariantAvailable(row) : false
              const selected = selectedTamanho === tamanho
              const needsColorFirst = product.tem_cor && !selectedCor
              const disabled = needsColorFirst || !available
              return (
                <button
                  key={tamanho}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectTamanho(tamanho)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-background text-foreground hover:bg-muted/30',
                    disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {tamanho}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {product.tem_cor && !product.tem_tamanho && selectedCor ? (
        (() => {
          const row = findRow(selectedCor, null)
          if (!row) return null
          return (
            <p className="text-xs text-muted-foreground">
              Disponibilidade: <span className="font-medium text-foreground">{formatAvailability(row)}</span>
            </p>
          )
        })()
      ) : null}
    </div>
  )
}

type ProductImageGalleryProps = {
  productName: string
  imageUrls: string[]
  activeImageIndex: number
  onSelectImage: (index: number) => void
  onPrevImage: () => void
  onNextImage: () => void
  layout: 'mobile' | 'desktop'
}

function ProductImageGallery({
  productName,
  imageUrls,
  activeImageIndex,
  onSelectImage,
  onPrevImage,
  onNextImage,
  layout,
}: ProductImageGalleryProps) {
  const activeImage = imageUrls[activeImageIndex] ?? null
  const hasMultipleImages = imageUrls.length > 1
  const isMobile = layout === 'mobile'

  return (
    <div className={cn(isMobile ? undefined : 'hidden sm:block')}>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-secondary',
          isMobile ? 'mx-auto h-36 w-full max-w-[220px]' : 'aspect-square w-full',
        )}
      >
        {activeImage ? (
          <img src={activeImage} alt={productName} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package size={isMobile ? 40 : 56} />
          </div>
        )}
        {isMobile && hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={onPrevImage}
              className="absolute left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-sm"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNextImage}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-sm"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        isMobile ? (
          <div className="mt-2 flex justify-center gap-1.5">
            {imageUrls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => onSelectImage(index)}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  index === activeImageIndex ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
                aria-label={`Imagem ${index + 1}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {imageUrls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => onSelectImage(index)}
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary transition-colors',
                  index === activeImageIndex ? 'border-primary' : 'border-border/60 hover:border-primary/40',
                )}
                aria-label={`Imagem ${index + 1}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}

function ProductSummaryHeader({
  product,
  titleId,
  className,
}: {
  product: FeedProduct
  titleId?: string
  className?: string
}) {
  return (
    <div className={className}>
      <h2 id={titleId} className="font-display text-lg font-semibold leading-snug sm:text-xl">
        {product.nome}
      </h2>
      {product.category?.name ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{product.category.name}</p>
      ) : null}
      <p className="mt-1.5 font-display text-base font-bold text-foreground sm:text-lg">
        {formatFeedProductCurrency(product.preco_referencia)}
      </p>
    </div>
  )
}

function VariantSelectionHint({
  product,
  canRequest,
}: {
  product: FeedProduct
  canRequest: boolean
}) {
  if (canRequest) return null

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      {product.tem_cor && product.tem_tamanho
        ? 'Selecione cor e tamanho disponíveis.'
        : product.tem_cor
          ? 'Selecione uma cor disponível.'
          : 'Selecione um tamanho disponível.'}
    </p>
  )
}

const FICHA_TECNICA_PREVIEW_CHARS = 120

export function FeedProductDetailDialog({ product, onClose }: FeedProductDetailDialogProps) {
  const navigate = useNavigate()
  const [selectedCor, setSelectedCor] = useState<string | null>(null)
  const [selectedTamanho, setSelectedTamanho] = useState<string | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [fichaTecnicaExpanded, setFichaTecnicaExpanded] = useState(false)

  useEffect(() => {
    setSelectedCor(null)
    setSelectedTamanho(null)
    setActiveImageIndex(0)
    setFichaTecnicaExpanded(false)
  }, [product?.id])

  const variantRows = useMemo(() => {
    if (!product) return []
    if (product.tem_cor || product.tem_tamanho) {
      const parsed = parseVariantStockRows(product.estoque_variacoes)
      if (parsed.length > 0) return parsed
      return buildVariantStockMatrix(
        product.tem_cor,
        product.tem_tamanho,
        product.cores ?? [],
        product.tamanhos ?? [],
      )
    }
    return []
  }, [product])

  const imageUrls = useMemo(() => {
    if (!product) return []
    const fromDb = getProductImageUrls(product)
    if (fromDb.length > 0) {
      return fromDb.map((url, index) => getFeedProductImage(index === 0 ? product.nome : '', url) ?? url)
    }
    const fallback = getFeedProductImage(product.nome, null)
    return fallback ? [fallback] : []
  }, [product])

  const hasVariants = variantRows.length > 0

  const colorOptions = useMemo(() => {
    if (!product?.tem_cor) return []
    const fromRows = variantRows.map((row) => row.cor).filter(Boolean) as string[]
    return orderVariantValues(product.cores ?? [], fromRows)
  }, [product, variantRows])

  const sizeOptions = useMemo(() => {
    if (!product?.tem_tamanho) return []
    const filteredRows = product.tem_cor && selectedCor
      ? variantRows.filter((row) => row.cor === selectedCor)
      : variantRows
    const fromRows = filteredRows.map((row) => row.tamanho).filter(Boolean) as string[]
    return orderVariantValues(product.tamanhos ?? [], fromRows)
  }, [product, variantRows, selectedCor])

  if (!product) return null

  const storeName = getSupplierStoreDisplayName(product.supplier)
  const rating = product.supplier?.avg_rating
  const location = product.cidade && product.uf ? `${product.cidade}/${product.uf}` : null
  const descricao = product.descricao?.trim() ?? ''
  const fichaTecnicaExpandable = descricao.length > FICHA_TECNICA_PREVIEW_CHARS

  function getSelectedVariant(): FeedProductVariantSelection | null {
    if (!hasVariants) return null

    const cor = product.tem_cor ? selectedCor : null
    const tamanho = product.tem_tamanho ? selectedTamanho : null

    if (product.tem_cor && !cor) return null
    if (product.tem_tamanho && !tamanho) return null

    const row = variantRows.find(
      (item) => variantStockKey(item.cor, item.tamanho) === variantStockKey(cor, tamanho),
    )
    if (!row || !isVariantAvailable(row)) return null
    return { cor: row.cor, tamanho: row.tamanho }
  }

  function handleSelectCor(cor: string) {
    setSelectedCor(cor)
    if (!product.tem_tamanho || !selectedTamanho) return

    const row = variantRows.find((item) => item.cor === cor && item.tamanho === selectedTamanho)
    if (!row || !isVariantAvailable(row)) {
      setSelectedTamanho(null)
    }
  }

  function handleRequestOffer() {
    if (hasVariants && !getSelectedVariant()) return
    const state = buildDemandStateFromProduct(product, getSelectedVariant())
    onClose()
    navigate('/buyer/demands/new', { state })
  }

  function handleOpenStore() {
    onClose()
    navigate(`/buyer/stores/${product.supplier_id}`)
  }

  function showPrevImage() {
    setActiveImageIndex((index) => (index - 1 + imageUrls.length) % imageUrls.length)
  }

  function showNextImage() {
    setActiveImageIndex((index) => (index + 1) % imageUrls.length)
  }

  const canRequest = !hasVariants || Boolean(getSelectedVariant())

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-product-dialog-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl animate-in slide-in-from-bottom-full fade-in duration-300 ease-out sm:max-w-3xl sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm sm:right-4 sm:top-4"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative shrink-0 border-b border-border/60 bg-secondary/40 px-4 pb-3 pt-4 sm:hidden">
          <ProductImageGallery
            layout="mobile"
            productName={product.nome}
            imageUrls={imageUrls}
            activeImageIndex={activeImageIndex}
            onSelectImage={setActiveImageIndex}
            onPrevImage={showPrevImage}
            onNextImage={showNextImage}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-4 sm:px-6 sm:pb-4 sm:pt-12">
          <div className="space-y-3 sm:space-y-6">
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] sm:items-start sm:gap-6">
              <ProductImageGallery
                layout="desktop"
                productName={product.nome}
                imageUrls={imageUrls}
                activeImageIndex={activeImageIndex}
                onSelectImage={setActiveImageIndex}
                onPrevImage={showPrevImage}
                onNextImage={showNextImage}
              />

              <div className="min-w-0 space-y-4">
                <ProductSummaryHeader product={product} titleId="feed-product-dialog-title" />
                {hasVariants ? (
                  <div>
                    <VariantPickers
                      layout="desktop"
                      product={product}
                      variantRows={variantRows}
                      colorOptions={colorOptions}
                      sizeOptions={sizeOptions}
                      selectedCor={selectedCor}
                      selectedTamanho={selectedTamanho}
                      onSelectCor={handleSelectCor}
                      onSelectTamanho={setSelectedTamanho}
                    />
                    <VariantSelectionHint product={product} canRequest={canRequest} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="sm:hidden">
              <ProductSummaryHeader product={product} titleId="feed-product-dialog-title" />
            </div>

            {hasVariants ? (
              <div className="sm:hidden">
                <VariantPickers
                  layout="mobile"
                  product={product}
                  variantRows={variantRows}
                  colorOptions={colorOptions}
                  sizeOptions={sizeOptions}
                  selectedCor={selectedCor}
                  selectedTamanho={selectedTamanho}
                  onSelectCor={handleSelectCor}
                  onSelectTamanho={setSelectedTamanho}
                />
                <VariantSelectionHint product={product} canRequest={canRequest} />
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold text-foreground">Ficha técnica</p>
              <div className="mt-1.5 space-y-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 text-sm text-muted-foreground">
                {descricao ? (
                  <div className="space-y-1">
                    <p
                      className={cn(
                        'leading-relaxed text-foreground',
                        !fichaTecnicaExpanded && fichaTecnicaExpandable && 'line-clamp-3',
                      )}
                    >
                      {descricao}
                    </p>
                    {fichaTecnicaExpandable ? (
                      <button
                        type="button"
                        onClick={() => setFichaTecnicaExpanded((expanded) => !expanded)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {fichaTecnicaExpanded ? 'Ver menos' : 'Ver mais'}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p>Sem descrição detalhada.</p>
                )}
                {product.marca ? (
                  <p>
                    <span className="font-medium text-foreground">Marca:</span> {product.marca}
                  </p>
                ) : null}
                {product.sku ? (
                  <p>
                    <span className="font-medium text-foreground">SKU:</span> {product.sku}
                  </p>
                ) : null}
                {location ? (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">Local:</span> {location}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Loja</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{storeName}</span>
                {product.supplier?.status === 'aprovado' ? (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verificado" />
                ) : null}
              </p>
              {rating != null && rating > 0 ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleOpenStore}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Ver loja completa
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 p-3">
          <Button
            type="button"
            className="h-10 w-full"
            disabled={!canRequest}
            onClick={handleRequestOffer}
          >
            Solicitar oferta
          </Button>
        </div>
      </div>
    </div>
  )
}
