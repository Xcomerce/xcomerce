import { z } from 'zod'
import {
  getMinTotalPrice,
  getMinUnitPrice,
  isOfferTotalViable,
  OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
} from '../pricing/offer-bounds'

export const offerSchema = z.object({
  demand_id: z.string().uuid(),
  valor: z.coerce.number().min(0, 'Valor inválido'),
  prazo_entrega_dias: z.coerce.number().int().min(1, 'Prazo mínimo é 1 dia'),
  validade_dias: z.coerce.number().int().min(1).max(30).default(7),
  quantidade: z.coerce.number().int().min(1),
  mensagem: z.string().max(1000).optional(),
})

export type OfferInput = z.infer<typeof offerSchema>

export function createOfferSchema(marketUnitPrice?: number | null) {
  if (marketUnitPrice == null || marketUnitPrice <= 0) {
    return offerSchema
  }

  const minUnit = getMinUnitPrice(marketUnitPrice)

  return offerSchema.superRefine((data, ctx) => {
    if (!isOfferTotalViable(data.valor, data.quantidade, marketUnitPrice)) {
      const minTotal = getMinTotalPrice(marketUnitPrice, data.quantidade)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valor'],
        message: `Valor abaixo do limite viável. Mínimo: ${formatBrl(minTotal)} (preço unitário mín. ${formatBrl(minUnit)}, margem máx. ${OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}% abaixo do mercado).`,
      })
    }
  })
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
