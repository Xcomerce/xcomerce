import { z } from 'zod'

function computeDeliveryDaysFromDateTime(value: string): number {
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return 1
  const diffMs = target.getTime() - Date.now()
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export const offerSchema = z
  .object({
    demand_id: z.string().uuid(),
    valor: z.coerce.number().min(0, 'Valor inválido'),
    prazo_entrega_em: z.string().min(1, 'Informe o prazo de entrega'),
    prazo_entrega_dias: z.coerce.number().int().min(1).optional(),
    validade_dias: z.coerce.number().int().min(1).max(30).default(7),
    quantidade: z.coerce.number().int().min(1),
    mensagem: z.string().max(1000).optional(),
  })
  .transform((value) => ({
    ...value,
    prazo_entrega_dias: value.prazo_entrega_dias ?? computeDeliveryDaysFromDateTime(value.prazo_entrega_em),
  }))

export type OfferInput = z.infer<typeof offerSchema>

/** @deprecated marketUnitPrice ignored — fornecedor define preço livremente */
export function createOfferSchema(_marketUnitPrice?: number | null) {
  return offerSchema
}
