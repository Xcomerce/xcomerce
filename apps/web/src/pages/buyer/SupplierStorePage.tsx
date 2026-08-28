import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, MapPin, Package, Star, Store } from 'lucide-react'
import { getSupplierStoreDisplayName } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { FeedProductCard } from '@/components/buyer/FeedProductCard'
import { FeedProductDetailDialog } from '@/components/buyer/FeedProductDetailDialog'
import { useSupplierCatalog, useSupplierStore } from '@/hooks/use-products'
import { usePageTitle } from '@/hooks/use-page-title'
import { getInitials } from '@/lib/utils'
import type { FeedProductListing } from '@/services/products'

export function SupplierStorePage() {
  usePageTitle()
  const { supplierId } = useParams<{ supplierId: string }>()
  const { data: store, isLoading: loadingStore, isError: storeError } = useSupplierStore(supplierId)
  const { data: catalog = [], isLoading: loadingCatalog } = useSupplierCatalog(supplierId)
  const [selectedProduct, setSelectedProduct] = useState<FeedProductListing | null>(null)

  const isLoading = loadingStore || loadingCatalog
  const storeName = store ? getSupplierStoreDisplayName(store) : 'Loja'

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <GridSkeleton count={4} />
      </div>
    )
  }

  if (storeError || !store) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loja não encontrada ou indisponível.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/buyer/feed">Voltar ao Explorar</Link>
        </Button>
      </div>
    )
  }

  const location =
    store.company?.cidade && store.company?.uf
      ? `${store.company.cidade}/${store.company.uf}`
      : null

  return (
    <>
      <div className="space-y-8 pb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-16 w-16">
                <AvatarImage src={store.profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-lg">
                  {getInitials(store.profile?.full_name ?? storeName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold">{storeName}</h1>
                  {store.status === 'aprovado' ? (
                    <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verificado" />
                  ) : null}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Store className="h-4 w-4" />
                  Fornecedor verificado na plataforma
                </p>
                {location ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  {store.avg_rating.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Média</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{store.total_ratings}</p>
                <p className="text-xs text-muted-foreground">Avaliações</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{store.orders_completed}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Produtos disponíveis</h2>
            <p className="text-sm text-muted-foreground">{catalog.length} item(ns)</p>
          </div>

          {catalog.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum produto disponível"
              description="Esta loja ainda não possui produtos ativos no catálogo."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {catalog.map((product) => (
                <FeedProductCard
                  key={product.feedListingKey}
                  product={product}
                  onSelect={setSelectedProduct}
                  layout="vertical"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <FeedProductDetailDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  )
}
