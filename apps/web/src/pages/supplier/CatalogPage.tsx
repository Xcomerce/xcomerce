import { useNavigate } from 'react-router-dom'
import { Boxes, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { PaywallModal } from '@/components/common/PaywallModal'
import { useProducts, useProductCount } from '@/hooks/use-products'
import { useSubscription } from '@/hooks/use-billing'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function CatalogPage() {
  const navigate = useNavigate()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { data: products = [], isLoading } = useProducts()
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const limit = subscription?.plan?.max_catalog_items ?? null
  const atLimit = limit !== null && count >= limit

  const uniqueCategoryIds = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category_id)))
  }, [products])

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

  function handleNewProduct() {
    if (atLimit) {
      setPaywallOpen(true)
      return
    }
    navigate('/supplier/catalog/new')
  }

  const activeProducts = products.filter((p) => p.is_active)

  const filteredProducts = selectedCategoryId
    ? activeProducts.filter((p) => p.category_id === selectedCategoryId)
    : activeProducts

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.length > 0 && (
            <>
              <Button
                size="sm"
                variant={selectedCategoryId === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategoryId(null)}
              >
                Todos
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <QuotaBadge used={count} limit={limit} label="Itens" />
          <Button onClick={handleNewProduct}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo produto</span>
          </Button>
        </div>
      </div>

      {isLoading && <GridSkeleton />}

      {!isLoading && activeProducts.length === 0 && (
        <EmptyState
          icon={Boxes}
          title="Catálogo vazio"
          description="Cadastre produtos para reforçar suas propostas."
          actionLabel="Novo produto"
          onAction={handleNewProduct}
        />
      )}

      {activeProducts.length > 0 && (
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
