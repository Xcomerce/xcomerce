import { z } from 'zod'

export const cnpjSchema = z.object({
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos'),
})

export const supplierAddressSchema = z.object({
  service_city: z.string().min(2),
  service_uf: z.string().length(2),
  service_radius_km: z.coerce.number().int().min(1).max(500).default(50),
})

export const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export type RatingInput = z.infer<typeof ratingSchema>
