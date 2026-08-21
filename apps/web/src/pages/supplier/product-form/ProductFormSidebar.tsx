import { ArrowRight, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { ProductFormActions } from './ProductFormActions'
import { ProductPreviewGrid } from './ProductPreviewGrid'
import type { ProductFormSummary } from './utils'
import { cn } from '@/lib/utils'

type PreviewItem = {
  key: string
  label: string
  imageUrl: string | null
}

type ProductFormSidebarProps = {
  productName: string
  price: number | null | undefined
  previewItems: PreviewItem[]
  summary: ProductFormSummary
  isSaving: boolean
  canSave: boolean
  isEdit: boolean
  isDeleting?: boolean
  showQuota?: boolean
  quotaUsed?: number
  quotaLimit?: number | null
  onPublish: () => void
  onSaveDraft: () => void
  onDelete?: () => void
  onCancel?: () => void
  className?: string
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ProductFormSidebar({
  productName,
  price,
  previewItems,
  summary,
  isSaving,
  canSave,
  isEdit,
  isDeleting,
  showQuota,
  quotaUsed,
  quotaLimit,
  onPublish,
  onSaveDraft,
  onDelete,
  onCancel,
  className,
}: ProductFormSidebarProps) {
  const stockLabel = summary.hasUnlimitedStock
    ? 'Ilimitado'
    : `${summary.totalStock ?? 0} un`

  return (
    <aside className={cn('glass-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden', className)}>
      <div className="scrollbar-custom min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 lg:px-4">
        {showQuota && quotaUsed !== undefined ? (
          <div className="flex justify-end">
            <QuotaBadge used={quotaUsed} limit={quotaLimit ?? null} label="Catálogo" />
          </div>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Preview do anúncio</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductPreviewGrid productName={productName} price={price} items={previewItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resumo do produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <SummaryRow label="Cores cadastradas" value={String(summary.colorCount)} />
            <SummaryRow label="Tamanhos por cor" value={String(summary.sizesPerColor)} />
            <SummaryRow label="Variações totais" value={String(summary.totalVariations)} />
            <SummaryRow label="Estoque total" value={stockLabel} />
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardContent className="space-y-2 pt-5">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Como funciona?</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Produtos publicados ficam visíveis para compradores no feed. Cada cor pode aparecer
                  como um anúncio separado na página Explorar.
                </p>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Saiba mais
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden shrink-0 border-t border-sidebar-border px-4 py-4 lg:block">
        <ProductFormActions
          isSaving={isSaving}
          canSave={canSave}
          isEdit={isEdit}
          isDeleting={isDeleting}
          onPublish={onPublish}
          onSaveDraft={onSaveDraft}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </div>
    </aside>
  )
}
