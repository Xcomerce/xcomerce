import { z } from 'zod'

export const demandSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  category_id: z.string().uuid('Selecione uma categoria'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade mínima é 1'),
  unidade: z.string().min(1, 'Informe a unidade'),
  cidade: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  raio_km: z.coerce.number().int().min(1).max(500).default(50),
  prazo_desejado: z.string().optional(),
  observacoes: z.string().optional(),
  preco_referencia_mercado: z.coerce.number().min(0).optional(),
})

export type DemandInput = z.infer<typeof demandSchema>
