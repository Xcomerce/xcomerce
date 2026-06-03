import { z } from 'zod'

export const offerSchema = z.object({
  demand_id: z.string().uuid(),
  valor: z.coerce.number().min(0, 'Valor inválido'),
  prazo_entrega_dias: z.coerce.number().int().min(1, 'Prazo mínimo é 1 dia'),
  validade_dias: z.coerce.number().int().min(1).max(30).default(7),
  quantidade: z.coerce.number().int().min(1),
  mensagem: z.string().max(1000).optional(),
})

export type OfferInput = z.infer<typeof offerSchema>
