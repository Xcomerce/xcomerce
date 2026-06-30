import { z } from 'zod'

export const buyerAddressSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos'),
  logradouro: z.string().min(2, 'Informe o logradouro'),
  numero: z.string().min(1, 'Informe o número'),
  bairro: z.string().min(2, 'Informe o bairro'),
  city: z.string().min(2, 'Informe a cidade'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  complemento: z.string().optional(),
})

export type BuyerAddressInput = z.infer<typeof buyerAddressSchema>

export type BuyerAddress = BuyerAddressInput

export function isBuyerAddressComplete(
  address: Partial<BuyerAddress> | null | undefined,
): address is BuyerAddress {
  if (!address) return false
  return buyerAddressSchema.safeParse(address).success
}

export function formatBuyerAddressSummary(address: Partial<BuyerAddress>): string {
  const parts = [
    address.logradouro,
    address.numero && `nº ${address.numero}`,
    address.bairro,
    address.complemento,
    address.city && address.uf ? `${address.city}/${address.uf}` : address.city ?? address.uf,
  ].filter(Boolean)
  return parts.join(', ')
}
