import { z } from 'zod'
import {
  COMBINATION_BLOCK_THRESHOLD,
  MAX_OPTIONS_PER_AXIS,
  MAX_VARIANT_AXES,
  type VariantAxis,
  countCombinations,
  normalizeVariantAxes,
} from '../utils/variant-axes'
import { dedupeVariantValues, normalizeVariantValue } from '../utils/variant-normalize'
import {
  buildVariantStockMatrixFromAxes,
  normalizeVariantStockRows,
  type ProductVariantStockRow,
} from '../constants/product-variant-stock'
import { isValidShoeSize, sortSizeValues, type ProductSizeType } from '../constants/product-sizes'

export const variantAxisSchema = z.object({
  name: z.string().trim().min(1, 'Nome da variação obrigatório'),
  options: z.array(z.string().trim().min(1)).default([]),
  images: z.record(z.string()).optional().default({}),
})

export const productSizeTypeSchema = z.enum(['roupa', 'calcado', 'numerico', 'livre'])

export const productVariantStockRowSchema = z.object({
  cor: z.string().nullable(),
  tamanho: z.string().nullable(),
  values: z.record(z.string()).default({}),
  quantidade: z.number().int().min(0).nullable(),
  ilimitado: z.boolean(),
  preco: z.number().min(0).nullable().default(null),
  sku: z.string().nullable().optional().default(null),
})

export const productSchema = z
  .object({
    nome: z.string().min(2, 'Nome obrigatório'),
    category_id: z.string().uuid(),
    sku: z.string().optional().transform((value) => value?.trim() || undefined),
    descricao: z.string().optional(),
    marca: z.string().optional(),
    preco_referencia: z.preprocess(
      (value) => {
        if (value === '' || value === null || value === undefined) return undefined
        return Number(value)
      },
      z
        .number({ required_error: 'Valor obrigatório', invalid_type_error: 'Valor obrigatório' })
        .min(0, 'Informe um valor válido'),
    ),
    cidade: z.string().min(2),
    uf: z.string().length(2),
    is_active: z.boolean().default(true),
    is_draft: z.boolean().default(false),
    draft_expires_at: z.string().nullable().optional(),
    tem_cor: z.boolean().default(false),
    tem_tamanho: z.boolean().default(false),
    tipo_tamanho: productSizeTypeSchema.nullable().optional(),
    cores: z.array(z.string().trim().min(1)).default([]),
    tamanhos: z.array(z.string().trim().min(1)).default([]),
    variant_axes: z.array(variantAxisSchema).default([]),
    estoque_variacoes: z.array(productVariantStockRowSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const axes = normalizeVariantAxes(data.variant_axes as VariantAxis[])

    if (axes.length > MAX_VARIANT_AXES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Máximo de ${MAX_VARIANT_AXES} tipos de variação`,
        path: ['variant_axes'],
      })
    }

    for (const axis of axes) {
      if (axis.options.length > MAX_OPTIONS_PER_AXIS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Máximo de ${MAX_OPTIONS_PER_AXIS} opções por variação (${axis.name})`,
          path: ['variant_axes'],
        })
      }
      if (axis.name && axis.options.length === 0 && axes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A variação "${axis.name}" precisa de ao menos uma opção`,
          path: ['variant_axes'],
        })
      }
    }

    const comboCount = countCombinations(axes)
    if (comboCount > COMBINATION_BLOCK_THRESHOLD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Limite de ${COMBINATION_BLOCK_THRESHOLD} combinações excedido (${comboCount})`,
        path: ['variant_axes'],
      })
    }

    const cores = dedupeVariantValues(data.cores)
    const tamanhos = dedupeVariantValues(data.tamanhos)

    if (data.tem_tamanho && data.tipo_tamanho === 'calcado') {
      const hasHalf = tamanhos.some((t) => t.includes('.'))
      for (const size of tamanhos) {
        if (!isValidShoeSize(size, hasHalf)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Tamanho inválido para calçado: ${size}`,
            path: ['tamanhos'],
          })
          break
        }
      }
    }

    const hasVariants = axes.some((a) => a.options.length > 0) || data.tem_cor || data.tem_tamanho

    if (hasVariants) {
      const effectiveAxes =
        axes.length > 0
          ? axes
          : buildLegacyAxes(data.tem_cor, data.tem_tamanho, cores, tamanhos, data.tipo_tamanho)

      const expected = buildVariantStockMatrixFromAxes(effectiveAxes)
      const stock = normalizeVariantStockRows(data.estoque_variacoes ?? [])

      if (stock.length !== expected.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe a quantidade de cada variação',
          path: ['estoque_variacoes'],
        })
      }

      for (const row of stock) {
        if (row.ilimitado) continue
        if (row.quantidade === null || row.quantidade < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Informe a quantidade ou marque Ilimitado para "${formatRowLabel(row)}"`,
            path: ['estoque_variacoes'],
          })
          break
        }
      }
    }
  })
  .transform((data) => {
    let axes = normalizeVariantAxes(data.variant_axes as VariantAxis[])

    if (axes.length === 0 && (data.tem_cor || data.tem_tamanho)) {
      axes = buildLegacyAxes(data.tem_cor, data.tem_tamanho, data.cores, data.tamanhos, data.tipo_tamanho)
    }

    const legacy = legacyFromAxes(axes, data)

    const estoque =
      axes.some((a) => a.options.length > 0)
        ? normalizeVariantStockRows(buildVariantStockMatrixFromAxes(axes, data.estoque_variacoes ?? []))
        : []

    return {
      ...data,
      ...legacy,
      variant_axes: axes,
      estoque_variacoes: estoque,
    }
  })

function buildLegacyAxes(
  temCor: boolean,
  temTamanho: boolean,
  cores: string[],
  tamanhos: string[],
  tipoTamanho?: ProductSizeType | null,
): VariantAxis[] {
  const axes: VariantAxis[] = []
  if (temCor && cores.length > 0) {
    axes.push({ name: 'Cor', options: dedupeVariantValues(cores), images: {} })
  }
  if (temTamanho && tamanhos.length > 0) {
    axes.push({
      name: tipoTamanho === 'calcado' ? 'Numeração' : 'Tamanho',
      options: sortSizeValues(dedupeVariantValues(tamanhos), tipoTamanho),
      images: {},
    })
  }
  return axes
}

function legacyFromAxes(
  axes: VariantAxis[],
  data: { tem_cor: boolean; tem_tamanho: boolean; tipo_tamanho?: ProductSizeType | null; cores: string[]; tamanhos: string[] },
) {
  const corAxis = axes.find((a) => ['cor', 'cores'].includes(normalizeVariantValue(a.name)))
  const sizeAxis = axes.find((a) =>
    ['tamanho', 'tamanhos', 'numeracao', 'numeração'].includes(normalizeVariantValue(a.name)),
  )

  return {
    tem_cor: Boolean(corAxis?.options.length),
    tem_tamanho: Boolean(sizeAxis?.options.length),
    cores: corAxis?.options ?? [],
    tamanhos: sizeAxis?.options ?? [],
    tipo_tamanho: sizeAxis
      ? data.tipo_tamanho ?? (normalizeVariantValue(sizeAxis.name).includes('numer') ? 'calcado' : 'livre')
      : null,
  }
}

function formatRowLabel(row: ProductVariantStockRow): string {
  const parts = Object.values(row.values ?? {}).filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  return [row.cor, row.tamanho].filter(Boolean).join(' · ') || 'Padrão'
}

export type ProductInput = z.input<typeof productSchema>
export type ProductInputParsed = z.output<typeof productSchema>
