import { LayoutGrid, Package } from 'lucide-react'
import { formatVariationOptionLabel } from '@keve/shared'
import { cn } from '@/lib/utils'
import { formatFeedProductCurrency } from './utils'

type PreviewItem = {
  key: string
  label: string
  imageUrl: string | null
}

type ProductPreviewGridProps = {
  productName: string
  price: number | null | undefined
  items: PreviewItem[]
  variationCount?: number
  className?: string
}

export function ProductPreviewGrid({
  productName,
  price,
  items,
  variationCount = 0,
  className,
}: ProductPreviewGridProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30',
          className,
        )}
      >
        <div className="space-y-2 px-4 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">Adicione imagens e variações para ver o preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {items.map((item) => (
        <article key={item.key} className="min-w-0">
          <div className="relative aspect-[4/4.5] overflow-hidden rounded-xl border border-border/40 bg-secondary">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package size={24} />
              </div>
            )}
          </div>
          <div className="mt-1.5 space-y-0.5 px-0.5">
            <p className="truncate font-display text-xs font-semibold text-foreground" title={productName}>
              {productName || 'Nome do produto'}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">{item.label}</p>
            {variationCount > 1 ? (
              <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                <LayoutGrid size={10} className="shrink-0 opacity-70" aria-hidden />
                <span>{formatVariationOptionLabel(variationCount)}</span>
              </p>
            ) : null}
            <p className="font-display text-xs font-bold text-foreground">
              {formatFeedProductCurrency(price ?? null)}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}
