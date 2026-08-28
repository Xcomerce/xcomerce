import { LayoutGrid, Package } from 'lucide-react'
import {
  formatVariationOptionLabel,
  getPrimaryProductImageUrl,
  getSupplierStoreDisplayName,
} from '@keve/shared'
import { cn } from '@/lib/utils'
import type { FeedProductListing } from '@/services/products'

export const HORIZONTAL_CARD_CLASS =
  'w-[42%] min-w-[140px] max-w-[200px] flex-shrink-0 snap-start sm:w-[200px] md:w-[220px] lg:w-[240px]'

export function formatFeedProductCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function getFeedProductImage(nome: string, dbUrl: string | null): string | null {
  if (dbUrl) return dbUrl

  const nameLower = nome.toLowerCase()
  if (nameLower.includes('cimento')) return '/products/cimento.png'
  if (nameLower.includes('tijolo')) return '/products/tijolo.png'
  if (nameLower.includes('brita')) return '/products/brita.png'
  if (nameLower.includes('tinta') || nameLower.includes('esmalte')) return '/products/tinta.png'
  if (
    nameLower.includes('notebook') ||
    nameLower.includes('computador') ||
    nameLower.includes('switch') ||
    nameLower.includes('impressora')
  ) {
    return '/products/notebook.png'
  }
  if (nameLower.includes('arroz') || nameLower.includes('feijão') || nameLower.includes('azeite')) {
    return '/products/arroz.png'
  }
  if (nameLower.includes('água') || nameLower.includes('agua')) return '/products/agua.png'
  if (nameLower.includes('epi') || nameLower.includes('capacete') || nameLower.includes('uniforme')) {
    return '/products/epi.png'
  }
  if (
    nameLower.includes('caixa') ||
    nameLower.includes('embalagem') ||
    nameLower.includes('filme stretch') ||
    nameLower.includes('saco')
  ) {
    return '/products/caixa.png'
  }

  return null
}

type FeedProductCardProps = {
  product: FeedProductListing
  onSelect: (product: FeedProductListing) => void
  layout: 'horizontal' | 'vertical'
}

const MATCH_SOURCE_LABELS: Record<string, string> = {
  cor: 'Cor',
  tamanho: 'Tamanho',
  marca: 'Marca',
  categoria: 'Categoria',
  fornecedor: 'Fornecedor',
}

export function FeedProductCard({ product, onSelect, layout }: FeedProductCardProps) {
  const imageUrl = getFeedProductImage(
    product.nome,
    product.feedColorImageUrl ?? getPrimaryProductImageUrl(product),
  )
  const matchSource = 'matchSource' in product ? product.matchSource : undefined
  const matchLabel = matchSource ? MATCH_SOURCE_LABELS[matchSource] : null
  const supplierLine = product.supplier
    ? `${getSupplierStoreDisplayName(product.supplier)}${product.category?.name ? ` · ${product.category.name}` : ''}`
    : product.category?.name || ''
  const variationCount = product.feedVariationCount ?? 0

  return (
    <div
      onClick={() => onSelect(product)}
      className={cn('cursor-pointer', layout === 'horizontal' && HORIZONTAL_CARD_CLASS)}
    >
      <div className="relative aspect-[4/4.5] w-full overflow-hidden rounded-xl border border-border/40 bg-secondary transition-all duration-300 hover:border-primary/45 hover:scale-[1.03] hover:shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.nome}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package size={32} />
          </div>
        )}
        {matchLabel ? (
          <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {matchLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 space-y-1.5 px-0.5">
        <div className="min-w-0 space-y-0.5">
          <h4
            className="truncate font-display text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary"
            title={product.nome}
          >
            {product.nome}
          </h4>
          <p className="truncate text-xs text-muted-foreground">
            {product.feedColor ?? supplierLine}
          </p>
          {product.feedColor && supplierLine ? (
            <p className="truncate text-[11px] text-muted-foreground/80">{supplierLine}</p>
          ) : null}
          {variationCount > 1 ? (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <LayoutGrid size={12} className="shrink-0 opacity-70" aria-hidden />
              <span>{formatVariationOptionLabel(variationCount)}</span>
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <span className="font-display text-sm font-bold text-foreground">
            {formatFeedProductCurrency(product.preco_referencia)}
          </span>
        </div>
      </div>
    </div>
  )
}
