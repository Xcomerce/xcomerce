import { z } from 'zod'

export const cityLocationSchema = z.object({
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
})

export const demandSpecificationSchema = z.object({
  cor: z.string().trim().optional().or(z.literal('')),
  tamanho: z.string().trim().optional().or(z.literal('')),
  quantidade: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined
      return Number(value)
    },
    z.number({ invalid_type_error: 'Informe a quantidade' }).int().min(1, 'Quantidade mínima é 1'),
  ),
})

export const demandSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  descricao: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 10, {
      message: 'Descrição deve ter no mínimo 10 caracteres',
    }),
  category_id: z.string().uuid('Selecione uma categoria'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade mínima é 1').optional(),
  unidade: z.string().min(1).default('un'),
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  cidades: z.array(cityLocationSchema).default([]),
  raio_km: z.coerce.number().int().min(1).max(500).default(50),
  prazo_desejado: z.string().optional(),
  observacoes: z.string().optional(),
  preco_referencia_mercado: z.coerce.number().min(0).optional(),
  especificacoes: z.array(demandSpecificationSchema).default([]),
  cor: z.string().trim().optional().or(z.literal('')),
  tamanho: z.string().trim().optional().or(z.literal('')),
})

export type DemandSpecification = z.infer<typeof demandSpecificationSchema>
export type DemandInput = z.infer<typeof demandSchema>
