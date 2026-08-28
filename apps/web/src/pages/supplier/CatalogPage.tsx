import { useNavigate } from 'react-router-dom'
import { Boxes, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogStatusTabs, type CatalogStatusTab } from '@/components/catalog/CatalogStatusTabs'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { PaywallModal } from '@/components/common/PaywallModal'
import { CATALOG_LIMITS_ENABLED } from '@/config/features'
import { useProducts, useProductCount } from '@/hooks/use-products'
import { useSubscription } from '@/hooks/use-billing'
import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/services/products'

function isDraft(product: Product) {
  return (product as { is_draft?: boolean }).is_draft ?? false
}

function segmentProducts(products: Product[]) {
  return {
    active: products.filter((p) => p.is_active && !isDraft(p)),
    paused: products.filter((p) => !p.is_active && !isDraft(p)),
    draft: products.filter((p) => isDraft(p)),
  }
}

const TAB_EMPTY_MESSAGES: Record<CatalogStatusTab, { title: string; description: string }> = {
  active: {
    title: 'Nenhum produto ativo',
    description: 'Publique produtos para que apareçam no catálogo.',
  },
  paused: {
    title: 'Nenhum produto pausado',
    description: 'Produtos pausados ou excluídos aparecerão aqui.',
  },
  draft: {
    title: 'Nenhum rascunho',
    description: 'Salve um produto como rascunho para continuar depois.',
  },
}

export function CatalogPage() {
  const navigate = useNavigate()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { data: products = [], isLoading } = useProducts()
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const [statusTab, setStatusTab] = useState<CatalogStatusTab>('active')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const limit = CATALOG_LIMITS_ENABLED ? (subscription?.plan?.max_catalog_items ?? null) : null
  const atLimit = CATALOG_LIMITS_ENABLED && limit !== null && count >= limit

  const productsByStatus = useMemo(() => segmentProducts(products), [products])
  const tabProducts = productsByStatus[statusTab]

  const uniqueCategoryIds = useMemo(() => {
    return Array.from(new Set(tabProducts.map((p) => p.category_id)))
  }, [tabProducts])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-by-ids', uniqueCategoryIds],
    queryFn: async () => {
      if (uniqueCategoryIds.length === 0) return []
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', uniqueCategoryIds)
      if (error) throw error
      return data
    },
    enabled: uniqueCategoryIds.length > 0,
  })

  const categoryNamesById = useMemo(
    () => Object.fromEntries(categories.map((cat) => [cat.id, cat.name])),
    [categories],
  )

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return tabProducts
    return tabProducts.filter((p) => p.category_id === selectedCategoryId)
  }, [tabProducts, selectedCategoryId])

  const handleStatusTabChange = useCallback((tab: CatalogStatusTab) => {
    setStatusTab(tab)
    setSelectedCategoryId(null)
  }, [])

  function handleNewProduct() {
    if (atLimit) {
      setPaywallOpen(true)
      return
    }
    navigate('/supplier/catalog/new')
  }

  const hasAnyProducts = products.length > 0

  return (
    <div className="space-y-6">
      <CatalogStatusTabs
        activeTab={statusTab}
        onChange={handleStatusTabChange}
        counts={{
          active: productsByStatus.active.length,
          paused: productsByStatus.paused.length,
          draft: productsByStatus.draft.length,
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.length > 0 && (
            <>
              <Button
                size="sm"
                variant={selectedCategoryId === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategoryId(null)}
              >
                Todas ({tabProducts.length})
              </Button>
              {categories.map((cat) => {
                const catCount = tabProducts.filter((p) => p.category_id === cat.id).length
                return (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    {cat.name} ({catCount})
                  </Button>
                )
              })}
            </>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <QuotaBadge used={count} limit={limit} label="Ativos" />
          <Button onClick={handleNewProduct}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo produto</span>
          </Button>
        </div>
      </div>

      {isLoading && <GridSkeleton />}

      {!isLoading && !hasAnyProducts && (
        <EmptyState
          icon={Boxes}
          title="Catálogo vazio"
          description="Cadastre produtos para reforçar suas propostas."
          actionLabel="Novo produto"
          onAction={handleNewProduct}
        />
      )}

      {!isLoading && hasAnyProducts && tabProducts.length === 0 && (
        <CatalogTabEmptyState tab={statusTab} />
      )}

      {!isLoading && tabProducts.length > 0 && filteredProducts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-background/50 py-12 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Nenhum produto nesta categoria</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Selecione outra categoria ou veja todas.
          </p>
        </div>
      )}

      {!isLoading && filteredProducts.length > 0 && (
        <ProductGrid
          products={filteredProducts}
          editHref={(id) => `/supplier/catalog/${id}/edit`}
          categoryNamesById={categoryNamesById}
        />
      )}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        quotaType="catalog"
      />
    </div>
  )
}

function CatalogTabEmptyState({ tab }: { tab: CatalogStatusTab }) {
  const { title, description } = TAB_EMPTY_MESSAGES[tab]
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/50 py-12 text-center">
      <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground/60">{description}</p>
    </div>
  )
}
