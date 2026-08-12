import { z } from 'zod'

export const supplierStoreNameSchema = z
  .string()
  .trim()
  .max(120, 'Máximo de 120 caracteres')
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  })
  .refine((value) => value === null || value.length >= 2, {
    message: 'Nome da loja deve ter no mínimo 2 caracteres',
  })

export type SupplierStoreNameInput = z.infer<typeof supplierStoreNameSchema>
