import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import type { Product } from '@/services/products'
import { cn } from '@/lib/utils'

type Props = {
  products: Product[]
  onProductClick?: (product: Product) => void
  editHref?: (id: string) => string
  className?: string
}

function formatPrice(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function ProductGrid({ products, onProductClick, editHref, className }: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        className,
      )}
    >
      {products.map((product) => {
        const content = (
          <>
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-medium text-foreground">{product.nome}</p>
            <p className="text-[11px] text-muted-foreground">{formatPrice(product.preco_referencia)}</p>
            {!product.is_active && (
              <span className="text-[10px] font-medium text-destructive">Inativo</span>
            )}
          </>
        )

        const classNameCard =
          'flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2 transition-colors hover:border-primary/40'

        if (editHref) {
          return (
            <Link
              key={product.id}
              to={editHref(product.id)}
              className={classNameCard}
            >
              {content}
            </Link>
          )
        }

        return (
          <article
            key={product.id}
            className={cn(classNameCard, onProductClick && 'cursor-pointer')}
            onClick={onProductClick ? () => onProductClick(product) : undefined}
            onKeyDown={
              onProductClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') onProductClick(product)
                  }
                : undefined
            }
            role={onProductClick ? 'button' : undefined}
            tabIndex={onProductClick ? 0 : undefined}
          >
            {content}
          </article>
        )
      })}
    </div>
  )
}
