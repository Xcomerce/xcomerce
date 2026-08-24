import { normalizeVariantValue } from './product-sizes'

export type ProductVariantStockRow = {
  cor: string | null
  tamanho: string | null
  quantidade: number | null
  ilimitado: boolean
  preco: number | null
}

export function variantStockKey(cor: string | null | undefined, tamanho: string | null | undefined): string {
  return `${normalizeVariantValue(cor ?? '')}|${normalizeVariantValue(tamanho ?? '')}`
}

export function formatVariantStockLabel(row: ProductVariantStockRow): string {
  const parts = [row.cor, row.tamanho].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Padrão'
}

export function buildVariantStockMatrix(
  temCor: boolean,
  temTamanho: boolean,
  cores: string[],
  tamanhos: string[],
  existing: ProductVariantStockRow[] = [],
): ProductVariantStockRow[] {
  if (!temCor && !temTamanho) return []

  const byKey = new Map(existing.map((row) => [variantStockKey(row.cor, row.tamanho), row]))
  const rows: ProductVariantStockRow[] = []

  const push = (cor: string | null, tamanho: string | null) => {
    const prev = byKey.get(variantStockKey(cor, tamanho))
    rows.push(
      prev ?? {
        cor,
        tamanho,
        quantidade: null,
        ilimitado: false,
        preco: null,
      },
    )
  }

  if (temCor && temTamanho) {
    for (const cor of cores) {
      for (const tamanho of tamanhos) {
        push(cor, tamanho)
      }
    }
  } else if (temCor) {
    for (const cor of cores) push(cor, null)
  } else if (temTamanho) {
    for (const tamanho of tamanhos) push(null, tamanho)
  }

  return rows
}

export function parseVariantStockRows(value: unknown): ProductVariantStockRow[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      return {
        cor: typeof row.cor === 'string' ? row.cor : row.cor === null ? null : null,
        tamanho: typeof row.tamanho === 'string' ? row.tamanho : row.tamanho === null ? null : null,
        quantidade:
          typeof row.quantidade === 'number' && Number.isFinite(row.quantidade)
            ? Math.max(0, Math.floor(row.quantidade))
            : null,
        ilimitado: row.ilimitado === true,
        preco:
          typeof row.preco === 'number' && Number.isFinite(row.preco) && row.preco >= 0
            ? row.preco
            : null,
      } satisfies ProductVariantStockRow
    })
    .filter((row): row is ProductVariantStockRow => row !== null)
}

export function normalizeVariantStockRows(rows: ProductVariantStockRow[]): ProductVariantStockRow[] {
  return rows.map((row) => ({
    cor: row.cor?.trim() || null,
    tamanho: row.tamanho?.trim() || null,
    ilimitado: row.ilimitado === true,
    quantidade: row.ilimitado
      ? null
      : row.quantidade === null || row.quantidade === undefined
        ? null
        : Math.max(0, Math.floor(row.quantidade)),
    preco:
      typeof row.preco === 'number' && Number.isFinite(row.preco) && row.preco >= 0
        ? row.preco
        : null,
  }))
}
