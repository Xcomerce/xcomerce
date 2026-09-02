import { ORDER_STATUS_LABELS, type Tables } from '@keve/shared'
import {
  buildGoogleMapsDirectionsUrl,
  formatCompanyAddress,
  formatCompanyAddressPrintLines,
} from '@/lib/address'
import { formatPhone } from '@/lib/utils'
import type { BuyerOrderListItem, SupplierOrderListItem } from '@/services/orders'
import type { UserProfile } from '@/services/profile'
import type { OnboardingState } from '@/services/onboarding'

export type OrderPrintVariant = 'supplier' | 'buyer'

export type OrderPrintSupplier = {
  store_name?: string | null
  full_name?: string | null
  phone?: string | null
}

export type OrderPrintData = {
  order: Tables<'orders'> & { created_at?: string }
  pickupAt?: string | null
  demand?: {
    titulo: string
    descricao?: string | null
    cidade: string
    uf: string
    unidade: string
    quantidade: number
  } | null
  offer?: {
    valor: number
    quantidade: number
    prazo_entrega_dias: number
    prazo_entrega_em?: string | null
    mensagem?: string | null
  } | null
  buyer?: {
    full_name: string
    phone?: string | null
    email?: string | null
  } | null
  supplier?: OrderPrintSupplier | null
}

export type BuyerOrderPrintData = {
  order: Tables<'orders'> & { created_at?: string }
  pickupAt?: string | null
  offer?: {
    prazo_entrega_dias?: number | null
  } | null
  pickupLocation: {
    storeName: string
    addressLine1: string | null
    addressLine2: string | null
    mapsUrl: string | null
  }
}

export type OrderPrintPreviewState =
  | { variant: 'supplier'; data: OrderPrintData }
  | { variant: 'buyer'; data: BuyerOrderPrintData }
  | null

export function getOrderShortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase()
}

export function buildSupplierPrintContext(
  profile: UserProfile | null | undefined,
  onboarding?: Pick<OnboardingState, 'profile' | 'company'> | null,
): OrderPrintSupplier {
  return {
    store_name: onboarding?.profile?.store_name ?? onboarding?.company?.nome_fantasia ?? null,
    full_name: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
  }
}

export function buildSupplierOrderPrintData(
  order: SupplierOrderListItem,
  supplier: OrderPrintSupplier,
): OrderPrintData {
  return {
    order,
    pickupAt: order.offer?.prazo_entrega_em ?? null,
    demand: order.demand,
    offer: order.offer,
    buyer: order.buyer,
    supplier,
  }
}

export function buildBuyerOrderPrintData(order: BuyerOrderListItem): BuyerOrderPrintData {
  const storeName =
    order.supplier?.store_name ?? order.supplier?.profile?.full_name ?? 'Fornecedor'
  const addressLines = formatCompanyAddressPrintLines(order.supplier?.company ?? null)
  const formattedAddress = formatCompanyAddress(order.supplier?.company ?? null)

  return {
    order,
    pickupAt: order.offer?.prazo_entrega_em ?? null,
    offer: order.offer,
    pickupLocation: {
      storeName,
      addressLine1: addressLines.line1,
      addressLine2: addressLines.line2,
      mapsUrl: formattedAddress ? buildGoogleMapsDirectionsUrl(formattedAddress) : null,
    },
  }
}

export function canShowBuyerPickupReceipt(status: string): boolean {
  return (
    status === 'PAGAMENTO_CONFIRMADO' ||
    status === 'PAGAMENTO_INFORMADO' ||
    status === 'ENVIO_INFORMADO' ||
    status === 'ENTREGUE' ||
    status === 'CONCLUIDO'
  )
}

function esc(value: unknown): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function formatPickupForPrint(
  pickupAt: string | null | undefined,
  prazoEntregaDias?: number | null,
): string {
  if (pickupAt) {
    const date = new Date(pickupAt)
    if (Number.isNaN(date.getTime())) return '—'

    const datePart = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const timePart = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${datePart} • ${timePart}`
  }

  if (prazoEntregaDias) {
    return `Em ${prazoEntregaDias} ${prazoEntregaDias === 1 ? 'dia' : 'dias'}`
  }

  return '—'
}

function getOrderPrintBaseStyles(): string {
  return `
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #111827;
      margin: 0;
      padding: 32px;
      line-height: 1.45;
      background: #fff;
    }
    .page { max-width: 820px; margin: 0 auto; }
    .doc-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }
    .brand { min-width: 0; }
    .logo { height: 28px; width: auto; display: block; }
    .doc-title {
      margin: 10px 0 0;
      font-size: 14px;
      font-weight: 500;
      color: #4b5563;
    }
    .order-meta { text-align: right; flex-shrink: 0; }
    .meta-label {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9ca3af;
    }
    .order-id {
      margin: 4px 0 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    .issued {
      margin: 4px 0 0;
      font-size: 12px;
      color: #6b7280;
    }
    .divider {
      border: 0;
      border-top: 2px solid #111827;
      margin: 20px 0 18px;
    }
    .summary-box {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) 1px minmax(0, 0.9fr) 1px minmax(0, 1.2fr);
      align-items: center;
      gap: 0;
      border: 2px solid #111827;
      border-radius: 16px;
      padding: 18px 20px;
      margin-bottom: 18px;
    }
    .summary-divider {
      align-self: stretch;
      width: 1px;
      background: #d1d5db;
      margin: 0 18px;
    }
    .summary-col { min-width: 0; }
    .label {
      margin: 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9ca3af;
    }
    .pickup-value {
      margin: 8px 0 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    .status-value {
      margin: 8px 0 0;
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
    .summary-note {
      font-size: 13px;
      line-height: 1.5;
      color: #374151;
    }
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      border: 1px solid #d1d5db;
      border-radius: 14px;
      padding: 16px 18px;
      min-width: 0;
    }
    .card-label {
      margin: 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9ca3af;
    }
    .card-name {
      margin: 8px 0 0;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      word-break: break-word;
    }
    .card-detail {
      margin: 6px 0 0;
      font-size: 13px;
      color: #6b7280;
      word-break: break-word;
    }
    .location-box {
      border: 1px solid #d1d5db;
      border-radius: 14px;
      padding: 18px 20px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 20px;
      align-items: center;
    }
    .location-name {
      margin: 8px 0 0;
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      word-break: break-word;
    }
    .location-line {
      margin: 6px 0 0;
      font-size: 13px;
      color: #374151;
      word-break: break-word;
    }
    .qr-wrap {
      width: 112px;
      text-align: center;
      flex-shrink: 0;
    }
    .qr-frame {
      width: 112px;
      height: 112px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #fff;
    }
    .qr-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .qr-label {
      margin: 8px 0 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9ca3af;
    }
    .qr-hint {
      margin: 2px 0 0;
      font-size: 11px;
      color: #6b7280;
    }
    @media print {
      body { padding: 16px; }
      .page { max-width: none; }
    }
    @media (max-width: 720px) {
      body { padding: 20px; }
      .doc-header { flex-direction: column; }
      .order-meta { text-align: left; }
      .summary-box {
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .summary-divider { display: none; }
      .cards { grid-template-columns: 1fr; }
      .location-box { grid-template-columns: 1fr; }
      .qr-wrap { justify-self: start; }
    }
  `
}

export function buildOrderPrintHtml(data: OrderPrintData): string {
  const orderId = getOrderShortId(data.order.id)
  const createdAt = formatOrderDate(data.order.created_at)
  const pickupLabel = formatPickupForPrint(data.pickupAt, data.offer?.prazo_entrega_dias)
  const statusLabel = ORDER_STATUS_LABELS[data.order.status] ?? data.order.status
  const buyerName = data.buyer?.full_name ?? '—'
  const buyerPhone = data.buyer?.phone ? formatPhone(data.buyer.phone) : null
  const supplierName = data.supplier?.store_name ?? data.supplier?.full_name ?? '—'
  const supplierResponsible = data.supplier?.full_name ?? null
  const logoUrl = '/logo-dark.svg'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedido #${orderId}</title>
  <style>${getOrderPrintBaseStyles()}</style>
</head>
<body>
  <div class="page">
    <header class="doc-header">
      <div class="brand">
        <img src="${logoUrl}" alt="XCOMERCE" class="logo" />
        <p class="doc-title">Ordem de separação e retirada</p>
      </div>
      <div class="order-meta">
        <p class="meta-label">Pedido</p>
        <p class="order-id">#${orderId}</p>
        <p class="issued">Emitido em ${esc(createdAt)}</p>
      </div>
    </header>

    <hr class="divider" />

    <section class="summary-box">
      <div class="summary-col">
        <p class="label">Disponível para retirada</p>
        <p class="pickup-value">${esc(pickupLabel)}</p>
      </div>
      <div class="summary-divider" aria-hidden="true"></div>
      <div class="summary-col">
        <p class="label">Situação</p>
        <p class="status-value">${esc(statusLabel)}</p>
      </div>
      <div class="summary-divider" aria-hidden="true"></div>
      <div class="summary-note">
        O comprador retira no endereço do fornecedor. Levar documento e o número do pedido.
      </div>
    </section>

    <section class="cards">
      <article class="card">
        <p class="card-label">Comprador</p>
        <p class="card-name">${esc(buyerName)}</p>
        ${buyerPhone ? `<p class="card-detail">Telefone ${esc(buyerPhone)}</p>` : ''}
      </article>
      <article class="card">
        <p class="card-label">Fornecedor</p>
        <p class="card-name">${esc(supplierName)}</p>
        ${supplierResponsible ? `<p class="card-detail">Responsável ${esc(supplierResponsible)}</p>` : ''}
      </article>
    </section>
  </div>
</body>
</html>`
}

export function buildBuyerOrderPrintHtml(data: BuyerOrderPrintData): string {
  const orderId = getOrderShortId(data.order.id)
  const createdAt = formatOrderDate(data.order.created_at)
  const pickupLabel = formatPickupForPrint(data.pickupAt, data.offer?.prazo_entrega_dias)
  const statusLabel = ORDER_STATUS_LABELS[data.order.status] ?? data.order.status
  const logoUrl = '/logo-dark.svg'
  const qrUrl = data.pickupLocation.mapsUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(data.pickupLocation.mapsUrl)}`
    : null

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comprovante de retirada #${orderId}</title>
  <style>${getOrderPrintBaseStyles()}</style>
</head>
<body>
  <div class="page">
    <header class="doc-header">
      <div class="brand">
        <img src="${logoUrl}" alt="XCOMERCE" class="logo" />
        <p class="doc-title">Comprovante de retirada</p>
      </div>
      <div class="order-meta">
        <p class="meta-label">Pedido</p>
        <p class="order-id">#${orderId}</p>
        <p class="issued">Emitido em ${esc(createdAt)}</p>
      </div>
    </header>

    <hr class="divider" />

    <section class="summary-box">
      <div class="summary-col">
        <p class="label">Retirar em</p>
        <p class="pickup-value">${esc(pickupLabel)}</p>
      </div>
      <div class="summary-divider" aria-hidden="true"></div>
      <div class="summary-col">
        <p class="label">Situação</p>
        <p class="status-value">${esc(statusLabel)}</p>
      </div>
      <div class="summary-divider" aria-hidden="true"></div>
      <div class="summary-note">
        Levar documento com foto e o número do pedido.
      </div>
    </section>

    <section class="location-box">
      <div>
        <p class="label">Onde retirar</p>
        <p class="location-name">${esc(data.pickupLocation.storeName)}</p>
        ${data.pickupLocation.addressLine1 ? `<p class="location-line">${esc(data.pickupLocation.addressLine1)}</p>` : ''}
        ${data.pickupLocation.addressLine2 ? `<p class="location-line">${esc(data.pickupLocation.addressLine2)}</p>` : ''}
      </div>
      <div class="qr-wrap">
        <div class="qr-frame">
          ${qrUrl ? `<img src="${qrUrl}" alt="QR do endereço" />` : ''}
        </div>
        <p class="qr-label">QR do endereço</p>
        <p class="qr-hint">Aponte a câmera</p>
      </div>
    </section>
  </div>
</body>
</html>`
}

function printHtmlDocument(html: string, title: string): boolean {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', title)
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument ?? win?.document
  if (!win || !doc) {
    iframe.remove()
    return false
  }

  doc.open()
  doc.write(html)
  doc.close()

  let printed = false

  const cleanup = () => {
    iframe.remove()
  }

  const doPrint = () => {
    if (printed) return
    printed = true
    try {
      win.focus()
      win.print()
      win.addEventListener('afterprint', cleanup, { once: true })
      setTimeout(cleanup, 60_000)
    } catch {
      cleanup()
    }
  }

  if (doc.readyState === 'complete') {
    doPrint()
  } else {
    win.addEventListener('load', doPrint, { once: true })
    setTimeout(doPrint, 500)
  }

  return true
}

export function printOrderDocument(data: OrderPrintData): boolean {
  const orderId = getOrderShortId(data.order.id)
  return printHtmlDocument(buildOrderPrintHtml(data), `Impressão do pedido #${orderId}`)
}

export function printBuyerOrderDocument(data: BuyerOrderPrintData): boolean {
  const orderId = getOrderShortId(data.order.id)
  return printHtmlDocument(buildBuyerOrderPrintHtml(data), `Comprovante de retirada #${orderId}`)
}

export function buildOrderPrintPreviewHtml(preview: OrderPrintPreviewState): string | null {
  if (!preview) return null
  return preview.variant === 'supplier'
    ? buildOrderPrintHtml(preview.data)
    : buildBuyerOrderPrintHtml(preview.data)
}

export function printOrderPreview(preview: OrderPrintPreviewState): boolean {
  if (!preview) return false
  return preview.variant === 'supplier'
    ? printOrderDocument(preview.data)
    : printBuyerOrderDocument(preview.data)
}
