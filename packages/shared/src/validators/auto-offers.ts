import { z } from 'zod'
import { OFFER_MARKET_DOWNWARD_MARGIN_PERCENT } from '../pricing/offer-bounds'

export const autoOfferSettingsSchema = z
  .object({
    enabled: z.boolean(),
    discount_percent: z.coerce
      .number()
      .min(0, 'Desconto mínimo é 0%')
      .max(
        OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
        `Desconto máximo é ${OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}%`,
      ),
    min_demand_quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1'),
    max_demand_quantity: z.coerce.number().int().min(1).optional().nullable(),
    delivery_days: z.coerce.number().int().min(1, 'Prazo mínimo é 1 dia'),
    validity_days: z.coerce.number().int().min(1).max(30, 'Validade máxima é 30 dias'),
    default_message: z.string().max(1000).optional().nullable(),
    category_ids: z.array(z.string().uuid()).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.max_demand_quantity != null &&
      data.max_demand_quantity < data.min_demand_quantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_demand_quantity'],
        message: 'Quantidade máxima deve ser maior ou igual à mínima',
      })
    }
  })

export type AutoOfferSettingsInput = z.infer<typeof autoOfferSettingsSchema>

export const AUTO_OFFER_SKIP_REASON_LABELS: Record<string, string> = {
  disabled: 'Auto-proposta desativada',
  supplier_not_approved: 'Fornecedor não aprovado',
  demand_not_found: 'Demanda não encontrada',
  demand_not_open: 'Demanda não está aberta',
  no_match: 'Sem match com a demanda',
  offer_exists: 'Proposta já enviada',
  below_min_qty: 'Quantidade da demanda abaixo do mínimo',
  above_max_qty: 'Quantidade da demanda acima do máximo',
  category_not_allowed: 'Categoria não permitida',
  no_market_price: 'Sem preço de mercado de referência',
  quota_exceeded: 'Limite mensal de propostas atingido',
  below_market_margin: 'Preço abaixo da margem permitida',
  unexpected_error: 'Erro inesperado',
  sent: 'Proposta enviada',
}

export const AUTO_OFFER_STATUS_LABELS: Record<string, string> = {
  sent: 'Enviada',
  skipped: 'Ignorada',
  failed: 'Falhou',
}
