import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import type { Product } from '@/services/products'
import { cn } from '@/lib/utils'

type Props = {
  products: Product[]
  onProductClick?: (product: Product) => void
  editHref?: (id: string) => string
  categoryNamesById?: Record<string, string>
  className?: string
}

function formatPrice(value: number | null): string {
  if (value == null) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function ProductGrid({
  products,
  onProductClick,
  editHref,
  categoryNamesById,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        className,
      )}
    >
      {products.map((product) => {
        const editPath = editHref?.(product.id)
        const categoryName = categoryNamesById?.[product.category_id]

        return (
          <article key={product.id} className="flex min-w-0 flex-col">
            {editPath ? (
              <Link to={editPath} className="group block">
                <ProductImage product={product} />
              </Link>
            ) : (
              <button
                type="button"
                className="group block w-full text-left"
                onClick={onProductClick ? () => onProductClick(product) : undefined}
              >
                <ProductImage product={product} />
              </button>
            )}

            <div className="mt-2.5 space-y-1.5 px-0.5">
              <div className="min-w-0 space-y-0.5">
                {editPath ? (
                  <Link to={editPath}>
                    <h4
                      className="truncate font-display text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary"
                      title={product.nome}
                    >
                      {product.nome}
                    </h4>
                  </Link>
                ) : (
                  <h4
                    className="truncate font-display text-sm font-semibold leading-tight text-foreground"
                    title={product.nome}
                  >
                    {product.nome}
                  </h4>
                )}
                {!product.is_active && (
                  <p className="text-[10px] font-medium text-destructive">Inativo</p>
                )}
                {categoryName && (
                  <span
                    className="inline-flex max-w-full truncate rounded-full border border-border/50 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    title={categoryName}
                  >
                    {categoryName}
                  </span>
                )}
              </div>

              <div className="pt-0.5">
                <span className="font-display text-sm font-bold text-foreground">
                  {formatPrice(product.preco_referencia)}
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ProductImage({ product }: { product: Product }) {
  return (
    <div className="relative aspect-[4/4.5] w-full overflow-hidden rounded-xl border border-border/40 bg-secondary transition-all duration-300 group-hover:border-primary/45 group-hover:scale-[1.03] group-hover:shadow-sm">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.nome}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Package size={32} />
        </div>
      )}
      {product.sku && (
        <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-background/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/55 backdrop-blur-[2px]">
          {product.sku}
        </span>
      )}
    </div>
  )
}
