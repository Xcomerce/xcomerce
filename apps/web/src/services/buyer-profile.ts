import { supabase } from '@/lib/supabase'
import type { BuyerAddress, BuyerAddressInput } from '@keve/shared'

export type BuyerProfileAddress = Partial<BuyerAddress> & {
  user_id: string
}

const ADDRESS_COLUMNS =
  'user_id, cep, logradouro, numero, bairro, complemento, city, uf' as const

function mapRow(row: {
  user_id: string
  cep: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  complemento: string | null
  city: string | null
  uf: string | null
}): BuyerProfileAddress {
  return {
    user_id: row.user_id,
    cep: row.cep ?? undefined,
    logradouro: row.logradouro ?? undefined,
    numero: row.numero ?? undefined,
    bairro: row.bairro ?? undefined,
    complemento: row.complemento ?? undefined,
    city: row.city ?? undefined,
    uf: row.uf ?? undefined,
  }
}

export async function fetchBuyerAddress(userId: string): Promise<BuyerProfileAddress | null> {
  const { data, error } = await supabase
    .from('buyer_profiles')
    .select(ADDRESS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapRow(data)
}

export async function updateBuyerAddress(
  userId: string,
  input: BuyerAddressInput,
): Promise<BuyerProfileAddress> {
  const { data, error } = await supabase
    .from('buyer_profiles')
    .update({
      cep: input.cep,
      logradouro: input.logradouro,
      numero: input.numero,
      bairro: input.bairro,
      complemento: input.complemento ?? null,
      city: input.city,
      uf: input.uf.toUpperCase(),
    })
    .eq('user_id', userId)
    .select(ADDRESS_COLUMNS)
    .single()

  if (error) throw error
  return mapRow(data)
}
