import type { ProductInput } from '@keve/shared'

const COLOR_HEX_MAP: Record<string, string> = {
  preto: '#1a1a1a',
  branco: '#ffffff',
  azul: '#2563eb',
  'azul marinho': '#1e3a5f',
  vermelho: '#dc2626',
  verde: '#16a34a',
  amarelo: '#eab308',
  cinza: '#9ca3af',
  bege: '#d4b896',
  rosa: '#f472b6',
  marrom: '#78350f',
  nude: '#e8c4a0',
}

export function getColorHex(name: string): string {
  return COLOR_HEX_MAP[name.toLowerCase().trim()] ?? '#94a3b8'
}

export function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return true
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}

export type ProductFormSummary = {
  colorCount: number
  sizesPerColor: number
  totalVariations: number
  totalStock: number | null
  hasUnlimitedStock: boolean
}

export function computeProductFormSummary(values: ProductInput): ProductFormSummary {
  const cores = values.cores ?? []
  const tamanhos = values.tamanhos ?? []
  const rows = values.estoque_variacoes ?? []

  const colorCount = values.tem_cor ? cores.length : 0
  const sizesPerColor = values.tem_tamanho ? tamanhos.length : 0
  const totalVariations = rows.length

  const hasUnlimitedStock = rows.some((row) => row.ilimitado)
  const totalStock = hasUnlimitedStock
    ? null
    : rows.reduce((sum, row) => sum + (row.quantidade ?? 0), 0)

  return { colorCount, sizesPerColor, totalVariations, totalStock, hasUnlimitedStock }
}

export function formatFeedProductCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
