import { useNavigate } from 'react-router-dom'
import { Boxes, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { PaywallModal } from '@/components/common/PaywallModal'
import { useProducts, useDeleteProduct, useProductCount } from '@/hooks/use-products'
import { useSubscription } from '@/hooks/use-billing'
import { useState } from 'react'
import { translateSupabaseError } from '@/lib/errors'

export function CatalogPage() {
  const navigate = useNavigate()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { data: products = [], isLoading } = useProducts()
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const deleteProduct = useDeleteProduct()

  const limit = subscription?.plan?.max_catalog_items ?? null
  const atLimit = limit !== null && count >= limit

  function handleNewProduct() {
    if (atLimit) {
      setPaywallOpen(true)
      return
    }
    navigate('/supplier/catalog/new')
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Remover "${nome}" do catálogo?`)) return
    try {
      await deleteProduct.mutateAsync(id)
      toast.success('Produto removido')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao remover'))
    }
  }

  const activeProducts = products.filter((p) => p.is_active)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Catálogo</h1>
          <p className="text-sm text-muted-foreground">Produtos exibidos no seu perfil de fornecedor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuotaBadge used={count} limit={limit} label="Itens" />
          <Button onClick={handleNewProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
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
        <>
          <ProductGrid
            products={activeProducts}
            editHref={(id) => `/supplier/catalog/${id}/edit`}
          />
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {activeProducts.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => handleDelete(p.id, p.nome)}
              >
                Excluir {p.nome}
              </Button>
            ))}
          </div>
        </>
      )}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        quotaType="catalog"
      />
    </div>
  )
}
