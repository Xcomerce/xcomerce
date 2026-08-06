import { z } from 'zod'
import {
  dedupeVariantValues,
  isValidShoeSize,
  sortSizeValues,
  type ProductSizeType,
} from '../constants/product-sizes'
import {
  buildVariantStockMatrix,
  normalizeVariantStockRows,
} from '../constants/product-variant-stock'

export const productSizeTypeSchema = z.enum(['roupa', 'calcado', 'numerico', 'livre'])

export const productVariantStockRowSchema = z.object({
  cor: z.string().nullable(),
  tamanho: z.string().nullable(),
  quantidade: z.number().int().min(0).nullable(),
  ilimitado: z.boolean(),
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
    tem_cor: z.boolean().default(false),
    tem_tamanho: z.boolean().default(false),
    tipo_tamanho: productSizeTypeSchema.nullable().optional(),
    cores: z.array(z.string().trim().min(1)).default([]),
    tamanhos: z.array(z.string().trim().min(1)).default([]),
    estoque_variacoes: z.array(productVariantStockRowSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const cores = dedupeVariantValues(data.cores)
    const tamanhos = dedupeVariantValues(data.tamanhos)

    if (data.tem_cor && cores.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos uma cor disponível',
        path: ['cores'],
      })
    }

    if (data.tem_tamanho) {
      if (!data.tipo_tamanho) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione o tipo de tamanho',
          path: ['tipo_tamanho'],
        })
      }
      if (tamanhos.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe ao menos um tamanho disponível',
          path: ['tamanhos'],
        })
      }
      if (data.tipo_tamanho === 'calcado') {
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
    }

    if (data.tem_cor || data.tem_tamanho) {
      const expected = buildVariantStockMatrix(
        data.tem_cor,
        data.tem_tamanho,
        data.tem_cor ? cores : [],
        data.tem_tamanho ? tamanhos : [],
      )
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
            message: `Informe a quantidade ou marque Ilimitado para "${[row.cor, row.tamanho].filter(Boolean).join(' · ')}"`,
            path: ['estoque_variacoes'],
          })
          break
        }
      }
    }
  })
  .transform((data) => {
    const coresParsed = data.tem_cor ? dedupeVariantValues(data.cores) : []
    const tamanhosParsed = data.tem_tamanho
      ? sortSizeValues(dedupeVariantValues(data.tamanhos), data.tipo_tamanho as ProductSizeType)
      : []

    const estoque =
      data.tem_cor || data.tem_tamanho
        ? normalizeVariantStockRows(
            buildVariantStockMatrix(
              data.tem_cor,
              data.tem_tamanho,
              coresParsed,
              tamanhosParsed,
              data.estoque_variacoes ?? [],
            ),
          )
        : []

    return {
      ...data,
      cores: coresParsed,
      tamanhos: tamanhosParsed,
      tipo_tamanho: data.tem_tamanho ? (data.tipo_tamanho ?? null) : null,
      estoque_variacoes: estoque,
    }
  })

export type ProductInput = z.input<typeof productSchema>
export type ProductInputParsed = z.output<typeof productSchema>
