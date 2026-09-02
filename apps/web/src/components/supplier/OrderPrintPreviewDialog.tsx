import { useEffect, useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildOrderPrintPreviewHtml,
  getOrderShortId,
  printOrderPreview,
  type OrderPrintPreviewState,
} from '@/lib/order-print'

type OrderPrintPreviewDialogProps = {
  preview: OrderPrintPreviewState
  onClose: () => void
}

export function OrderPrintPreviewDialog({ preview, onClose }: OrderPrintPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!preview) return

    const html = buildOrderPrintPreviewHtml(preview)
    if (!html) return

    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!iframe || !doc) return

    doc.open()
    doc.write(html)
    doc.close()
  }, [preview])

  if (!preview) return null

  const orderId = getOrderShortId(preview.data.order.id)
  const isBuyer = preview.variant === 'buyer'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-print-preview-title"
        className="flex h-full min-h-0 flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 lg:px-6">
          <div className="min-w-0">
            <h2 id="order-print-preview-title" className="text-lg font-bold text-foreground">
              {isBuyer ? `Comprovante de retirada — Pedido #${orderId}` : `Pedido #${orderId}`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBuyer
                ? 'Versão do comprador. Leve impresso ou no celular.'
                : 'Pré-visualização — use o botão para imprimir ou salvar em PDF'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              className="rounded-xl font-semibold"
              onClick={() => {
                printOrderPreview(preview)
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-8">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border/70 bg-white shadow-lg">
            <iframe
              ref={iframeRef}
              title={
                isBuyer
                  ? `Comprovante de retirada #${orderId}`
                  : `Pré-visualização do pedido #${orderId}`
              }
              className="min-h-[720px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
