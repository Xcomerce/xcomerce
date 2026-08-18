import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { useFeedProducts, useSearchSuggestions } from '@/hooks/use-products'
import { useCategories, useRootCategories } from '@/hooks/use-categories'
import { getDescendantCategoryIds } from '@keve/shared'
import { cn } from '@/lib/utils'
import type { FeedProductSearchResult } from '@/services/products'
import {
  FeedProductCard,
  HORIZONTAL_CARD_CLASS,
} from '@/components/buyer/FeedProductCard'
import { FeedProductDetailDialog } from '@/components/buyer/FeedProductDetailDialog'

const HORIZONTAL_ROW_CLASS =
  'flex overflow-x-auto gap-3 sm:gap-4 pb-3 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 scroll-px-4 md:-mx-0 md:px-0 md:scroll-px-0'

const SCROLL_CHEVRON_CLASS =
  'absolute top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-0 text-foreground shadow-md transition-all duration-200 hover:bg-secondary'

const VERTICAL_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'

function ProductHorizontalRow({
  children,
  ariaLabel,
}: {
  children: ReactNode
  ariaLabel: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  function updateArrows() {
    if (!rowRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
    setShowLeftArrow(scrollLeft > 5)
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5)
  }

  useEffect(() => {
    const timer = setTimeout(updateArrows, 150)
    window.addEventListener('resize', updateArrows)

    const row = rowRef.current
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateArrows()) : null
    if (row && observer) observer.observe(row)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateArrows)
      observer?.disconnect()
    }
  }, [children])

  function scrollRow(direction: 'left' | 'right') {
    if (!rowRef.current) return
    const scrollAmount = Math.max(rowRef.current.clientWidth * 0.8, 280)
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
    setTimeout(updateArrows, 350)
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => scrollRow('left')}
        className={cn(SCROLL_CHEVRON_CLASS, '-left-[18px]', showLeftArrow ? 'hidden md:flex' : 'hidden')}
        aria-label="Rolar produtos para esquerda"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        ref={rowRef}
        onScroll={updateArrows}
        className={HORIZONTAL_ROW_CLASS}
        role="list"
        aria-label={ariaLabel}
      >
        {children}
      </div>

      <button
        type="button"
        onClick={() => scrollRow('right')}
        className={cn(SCROLL_CHEVRON_CLASS, '-right-[18px]', showRightArrow ? 'hidden md:flex' : 'hidden')}
        aria-label="Rolar produtos para direita"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function ProductVerticalGrid({ children }: { children: ReactNode }) {
  return <div className={VERTICAL_GRID_CLASS}>{children}</div>
}

function ProductSkeleton({ layout }: { layout: 'horizontal' | 'vertical' }) {
  const card = (
    <div className="space-y-2.5">
      <div className="aspect-[4/4.5] w-full animate-pulse rounded-xl bg-secondary" />
      <div className="space-y-2 px-0.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="mt-1 h-4 w-1/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  )

  if (layout === 'horizontal') {
    return (
      <ProductHorizontalRow ariaLabel="Carregando produtos">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={HORIZONTAL_CARD_CLASS}>
            {card}
          </div>
        ))}
      </ProductHorizontalRow>
    )
  }

  return (
    <ProductVerticalGrid>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>{card}</div>
      ))}
    </ProductVerticalGrid>
  )
}

export function BuyerFeedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const selectedUf = searchParams.get('uf') || ''
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<FeedProductSearchResult | null>(null)
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const { data: rootCategories = [], isLoading: loadingCategories } = useRootCategories()
  const { data: allCategories = [] } = useCategories()

  const categoryIds = useMemo(() => {
    if (!selectedCategory) return undefined
    return getDescendantCategoryIds(selectedCategory, allCategories)
  }, [selectedCategory, allCategories])

  const { data: products = [], isLoading: loadingProducts } = useFeedProducts({
    categoryIds,
    search: searchQuery || undefined,
    uf: selectedUf || undefined,
  })

  const hasOutsideUfResults = useMemo(
    () => Boolean(selectedUf && products.some((product) => product.isOutsideUf)),
    [products, selectedUf],
  )

  const { data: emptySuggestions = [] } = useSearchSuggestions(searchQuery, !loadingProducts && products.length === 0)

  const isFilteredView = Boolean(selectedCategory || searchQuery)

  const filteredTitle = useMemo(() => {
    if (searchQuery) return `Resultados para "${searchQuery}"`
    if (selectedCategory) {
      const category = rootCategories.find((cat) => cat.id === selectedCategory)
      return category?.name ?? 'Categoria'
    }
    return ''
  }, [rootCategories, searchQuery, selectedCategory])

  const groupedProducts = useMemo(() => {
    if (isFilteredView) return []

    const groups: { [categoryId: string]: { categoryName: string; products: typeof products } } = {}

    products.forEach((product) => {
      const catId = product.category_id || 'other'
      const catName = product.category?.name || 'Outros'

      if (!groups[catId]) {
        groups[catId] = {
          categoryName: catName,
          products: [],
        }
      }
      groups[catId].products.push(product)
    })

    return Object.entries(groups).map(([id, group]) => ({
      categoryId: id,
      categoryName: group.categoryName,
      products: group.products.slice(0, 12),
    }))
  }, [isFilteredView, products])

  function handleScroll() {
    if (categoriesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current
      setShowLeftArrow(scrollLeft > 5)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll()
    }, 150)
    return () => clearTimeout(timer)
  }, [rootCategories, products])

  function scrollCategories(direction: 'left' | 'right') {
    if (categoriesRef.current) {
      const scrollAmount = 300
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(handleScroll, 350)
    }
  }

  return (
    <>
      <div className="space-y-8 pb-12">
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className={cn(
              'absolute -left-[18px] top-1/2 z-10 -mt-0.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-0 text-foreground shadow-md transition-all duration-200 hover:bg-secondary',
              showLeftArrow ? 'hidden md:flex' : 'hidden',
            )}
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft size={15} />
          </button>

          <div
            ref={categoriesRef}
            onScroll={handleScroll}
            className="flex min-w-0 w-[calc(100%+2rem)] -mx-4 gap-2 overflow-x-auto scroll-smooth px-4 pb-2 scroll-px-4 no-scrollbar md:mx-0 md:w-full md:px-0 md:scroll-px-0"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all duration-200 ${
                selectedCategory === ''
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/60 bg-secondary/40 text-foreground hover:bg-secondary/70'
              }`}
            >
              Todas
            </button>
            {loadingCategories ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-secondary" />
              ))
            ) : (
              rootCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/60 bg-secondary/40 text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {cat.name}
                </button>
              ))
            )}
            <div className="w-4 shrink-0 md:hidden" aria-hidden />
          </div>

          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className={cn(
              'absolute -right-[18px] top-1/2 z-10 -mt-0.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-0 text-foreground shadow-md transition-all duration-200 hover:bg-secondary',
              showRightArrow ? 'hidden md:flex' : 'hidden',
            )}
            aria-label="Rolar para direita"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {isFilteredView ? (
          <h3 className="font-display text-lg font-normal text-foreground">{filteredTitle}</h3>
        ) : null}

        {hasOutsideUfResults ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            Nenhum produto em {selectedUf}. Exibindo resultados de outras regiões.
          </div>
        ) : null}

        <div className="space-y-4">
          {loadingProducts ? (
            <ProductSkeleton layout={isFilteredView ? 'vertical' : 'horizontal'} />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Package size={24} />
              </div>
              <h3 className="font-display text-lg font-semibold">Nenhum produto encontrado</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Tente redefinir seus filtros ou altere a busca para encontrar produtos dos fornecedores.
              </p>
              {emptySuggestions.length > 0 ? (
                <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                  {emptySuggestions.map((item) => (
                    <button
                      key={`${item.suggestionType}-${item.suggestion}`}
                      type="button"
                      onClick={() =>
                        navigate(`/buyer/feed?search=${encodeURIComponent(item.suggestion)}${selectedUf ? `&uf=${selectedUf}` : ''}`, {
                          replace: true,
                        })
                      }
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {item.suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : isFilteredView ? (
            <ProductVerticalGrid>
              {products.map((product) => (
                <FeedProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelectedProduct}
                  layout="vertical"
                />
              ))}
            </ProductVerticalGrid>
          ) : (
            <div className="space-y-10">
              {groupedProducts.map((group) => (
                <section key={group.categoryId} className="space-y-4">
                  <h4 className="pl-0.5 font-display text-base font-semibold text-foreground/80">
                    Mais procurados em {group.categoryName}
                  </h4>
                  <ProductHorizontalRow ariaLabel={`Produtos em ${group.categoryName}`}>
                    {group.products.map((product) => (
                      <FeedProductCard
                        key={product.id}
                        product={product}
                        onSelect={setSelectedProduct}
                        layout="horizontal"
                      />
                    ))}
                  </ProductHorizontalRow>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <FeedProductDetailDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  )
}
