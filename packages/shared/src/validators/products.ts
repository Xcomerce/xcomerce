import { z } from 'zod'
import {
  dedupeVariantValues,
  isValidShoeSize,
  sortSizeValues,
  type ProductSizeType,
} from '../constants/product-sizes'

export const productSizeTypeSchema = z.enum(['roupa', 'calcado', 'numerico', 'livre'])

export const productSchema = z
  .object({
    nome: z.string().min(2, 'Nome obrigatório'),
    category_id: z.string().uuid(),
    sku: z.string().optional().transform((value) => value?.trim() || undefined),
    descricao: z.string().optional(),
    marca: z.string().optional(),
    preco_referencia: z.coerce.number().min(0).optional(),
    cidade: z.string().min(2),
    uf: z.string().length(2),
    is_active: z.boolean().default(true),
    tem_cor: z.boolean().default(false),
    tem_tamanho: z.boolean().default(false),
    tipo_tamanho: productSizeTypeSchema.nullable().optional(),
    cores: z.array(z.string().trim().min(1)).default([]),
    tamanhos: z.array(z.string().trim().min(1)).default([]),
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
  })
  .transform((data) => ({
    ...data,
    cores: data.tem_cor ? dedupeVariantValues(data.cores) : [],
    tamanhos: data.tem_tamanho
      ? sortSizeValues(dedupeVariantValues(data.tamanhos), data.tipo_tamanho as ProductSizeType)
      : [],
    tipo_tamanho: data.tem_tamanho ? (data.tipo_tamanho ?? null) : null,
  }))

export type ProductInput = z.input<typeof productSchema>
export type ProductInputParsed = z.output<typeof productSchema>
