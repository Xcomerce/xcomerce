import {
  dedupeVariantValues,
  normalizeVariantValue,
  variantArrayContains,
} from '../utils/variant-normalize'
import type { VariantAxis } from '../utils/variant-axes'
import { countCombinations } from '../utils/variant-axes'

export type ProductVariantStockRow = {
  cor: string | null
  tamanho: string | null
  values: Record<string, string>
  quantidade: number | null
  ilimitado: boolean
  preco: number | null
  sku: string | null
}

export function variantStockKeyFromValues(values: Record<string, string>): string {
  const entries = Object.entries(values)
    .filter(([, v]) => v?.trim())
    .sort(([a], [b]) => normalizeVariantValue(a).localeCompare(normalizeVariantValue(b)))
    .map(([k, v]) => `${normalizeVariantValue(k)}=${normalizeVariantValue(v)}`)
  return entries.join('|')
}

export function variantStockKey(cor: string | null | undefined, tamanho: string | null | undefined): string {
  return variantStockKeyFromValues({
    Cor: cor ?? '',
    Tamanho: tamanho ?? '',
  })
}

export function rowToValues(row: ProductVariantStockRow): Record<string, string> {
  if (row.values && Object.keys(row.values).length > 0) {
    return { ...row.values }
  }
  const values: Record<string, string> = {}
  if (row.cor) values.Cor = row.cor
  if (row.tamanho) values.Tamanho = row.tamanho
  return values
}

export function formatVariantStockLabel(row: ProductVariantStockRow, axisNames?: string[]): string {
  const values = rowToValues(row)
  const parts = axisNames?.length
    ? axisNames.map((name) => values[name]).filter(Boolean)
    : Object.values(values).filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Padrão'
}

function cartesianProduct(axes: VariantAxis[]): Record<string, string>[] {
  if (axes.length === 0) return []
  let result: Record<string, string>[] = [{}]

  for (const axis of axes) {
    const next: Record<string, string>[] = []
    for (const combo of result) {
      for (const option of axis.options) {
        next.push({ ...combo, [axis.name]: option })
      }
    }
    result = next
  }

  return result
}

export function buildVariantStockMatrixFromAxes(
  axes: VariantAxis[],
  existing: ProductVariantStockRow[] = [],
): ProductVariantStockRow[] {
  const activeAxes = axes.filter((a) => a.name.trim() && a.options.length > 0)
  if (activeAxes.length === 0) return []

  const byKey = new Map(existing.map((row) => [variantStockKeyFromValues(rowToValues(row)), row]))
  const combos = cartesianProduct(activeAxes)

  return combos.map((values) => {
    const key = variantStockKeyFromValues(values)
    const prev = byKey.get(key)
    const legacy = legacyFieldsFromValues(values)

    return (
      prev ?? {
        cor: legacy.cor,
        tamanho: legacy.tamanho,
        values,
        quantidade: null,
        ilimitado: false,
        preco: null,
        sku: null,
      }
    )
  })
}

function legacyFieldsFromValues(values: Record<string, string>): {
  cor: string | null
  tamanho: string | null
} {
  let cor: string | null = null
  let tamanho: string | null = null

  for (const [name, val] of Object.entries(values)) {
    const norm = normalizeVariantValue(name)
    if (['cor', 'cores'].includes(norm)) cor = val
    if (['tamanho', 'tamanhos', 'numeracao', 'numeração'].includes(norm)) tamanho = val
  }

  return { cor, tamanho }
}

export function buildVariantStockMatrix(
  temCor: boolean,
  temTamanho: boolean,
  cores: string[],
  tamanhos: string[],
  existing: ProductVariantStockRow[] = [],
): ProductVariantStockRow[] {
  const axes: VariantAxis[] = []
  if (temCor && cores.length > 0) {
    axes.push({ name: 'Cor', options: cores })
  }
  if (temTamanho && tamanhos.length > 0) {
    axes.push({ name: 'Tamanho', options: tamanhos })
  }
  return buildVariantStockMatrixFromAxes(axes, existing)
}

export function syncVariantStockRows(
  axes: VariantAxis[],
  existing: ProductVariantStockRow[] = [],
): ProductVariantStockRow[] {
  return buildVariantStockMatrixFromAxes(axes, existing)
}

export function parseVariantStockRows(value: unknown): ProductVariantStockRow[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const values: Record<string, string> =
        row.values && typeof row.values === 'object' && !Array.isArray(row.values)
          ? Object.fromEntries(
              Object.entries(row.values as Record<string, unknown>)
                .filter(([, v]) => typeof v === 'string')
                .map(([k, v]) => [k, (v as string).trim()]),
            )
          : {}

      const cor = typeof row.cor === 'string' ? row.cor : row.cor === null ? null : null
      const tamanho = typeof row.tamanho === 'string' ? row.tamanho : row.tamanho === null ? null : null
      const resolvedValues =
        Object.keys(values).length > 0
          ? values
          : {
              ...(cor ? { Cor: cor } : {}),
              ...(tamanho ? { Tamanho: tamanho } : {}),
            }

      return {
        cor,
        tamanho,
        values: resolvedValues,
        quantidade:
          typeof row.quantidade === 'number' && Number.isFinite(row.quantidade)
            ? Math.max(0, Math.floor(row.quantidade))
            : null,
        ilimitado: row.ilimitado === true,
        preco:
          typeof row.preco === 'number' && Number.isFinite(row.preco) && row.preco >= 0
            ? row.preco
            : null,
        sku: typeof row.sku === 'string' ? row.sku.trim() || null : null,
      } satisfies ProductVariantStockRow
    })
    .filter((row): row is ProductVariantStockRow => row !== null)
}

export function normalizeVariantStockRows(rows: ProductVariantStockRow[]): ProductVariantStockRow[] {
  return rows.map((row) => {
    const values = rowToValues(row)
    const legacy = legacyFieldsFromValues(values)

    return {
      cor: legacy.cor,
      tamanho: legacy.tamanho,
      values,
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
      sku: row.sku?.trim() || null,
    }
  })
}

export function getCombinationCountFromAxes(axes: VariantAxis[]): number {
  return countCombinations(axes)
}

export { dedupeVariantValues, normalizeVariantValue, variantArrayContains }
