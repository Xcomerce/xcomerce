import { z } from 'zod'

export const productSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  category_id: z.string().uuid(),
  sku: z.string().optional(),
  descricao: z.string().optional(),
  marca: z.string().optional(),
  preco_referencia: z.coerce.number().min(0).optional(),
  cidade: z.string().min(2),
  uf: z.string().length(2),
  is_active: z.boolean().default(true),
})

export type ProductInput = z.infer<typeof productSchema>
