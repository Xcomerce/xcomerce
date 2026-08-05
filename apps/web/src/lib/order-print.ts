import type { Tables } from '@keve/shared'

export type OrderPrintData = {
  order: Tables<'orders'>
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
    mensagem?: string | null
  } | null
  buyer?: {
    full_name: string
    phone?: string | null
    email?: string | null
  } | null
  supplier?: {
    full_name: string
    phone?: string | null
    email?: string | null
    company_name?: string | null
  } | null
}

function esc(value: unknown): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function buildOrderPrintHtml(data: OrderPrintData): string {
  const orderId = data.order.id.slice(0, 8).toUpperCase()
  const createdAt = new Date(data.order.created_at).toLocaleString('pt-BR')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedido #${orderId}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; margin: 32px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .muted { color: #6b7280; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin-top: 24px; }
    .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; font-weight: 700; }
    .value { font-size: 15px; font-weight: 600; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Pedido #${orderId}</h1>
  <p class="muted">Emitido em ${esc(createdAt)} · XCOMERCE B2B</p>

  <div class="grid">
    <div class="box">
      <div class="section-title">Comprador</div>
      <div class="label">Nome</div><div class="value">${esc(data.buyer?.full_name)}</div>
      <div class="label" style="margin-top:12px">Telefone</div><div class="value">${esc(data.buyer?.phone)}</div>
      <div class="label" style="margin-top:12px">E-mail</div><div class="value">${esc(data.buyer?.email)}</div>
    </div>
    <div class="box">
      <div class="section-title">Fornecedor</div>
      <div class="label">Nome / Empresa</div><div class="value">${esc(data.supplier?.company_name ?? data.supplier?.full_name)}</div>
      <div class="label" style="margin-top:12px">Telefone</div><div class="value">${esc(data.supplier?.phone)}</div>
      <div class="label" style="margin-top:12px">E-mail</div><div class="value">${esc(data.supplier?.email)}</div>
    </div>
  </div>

  <div class="box" style="margin-top:16px">
    <div class="section-title">Demanda / Produto</div>
    <div class="label">Título</div><div class="value">${esc(data.demand?.titulo)}</div>
    ${data.demand?.descricao ? `<div class="label" style="margin-top:12px">Descrição</div><div class="value">${esc(data.demand.descricao)}</div>` : ''}
    <div class="label" style="margin-top:12px">Localização</div>
    <div class="value">${esc(data.demand?.cidade)}/${esc(data.demand?.uf)}</div>
  </div>

  <div class="grid" style="margin-top:16px">
    <div class="box">
      <div class="label">Quantidade</div>
      <div class="value">${esc(data.offer?.quantidade ?? data.demand?.quantidade)} ${esc(data.demand?.unidade)}</div>
    </div>
    <div class="box">
      <div class="label">Valor total</div>
      <div class="value">${data.offer ? formatCurrency(data.offer.valor) : '—'}</div>
    </div>
    <div class="box">
      <div class="label">Prazo de entrega</div>
      <div class="value">${data.offer ? `${data.offer.prazo_entrega_dias} dia(s)` : '—'}</div>
    </div>
    <div class="box">
      <div class="label">Status</div>
      <div class="value">${esc(data.order.status)}</div>
    </div>
  </div>

  ${data.offer?.mensagem ? `<div class="box" style="margin-top:16px"><div class="label">Observações da proposta</div><div class="value">${esc(data.offer.mensagem)}</div></div>` : ''}
</body>
</html>`
}

export function printOrderDocument(data: OrderPrintData): void {
  const html = buildOrderPrintHtml(data)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => {
    printWindow.print()
  }
}
