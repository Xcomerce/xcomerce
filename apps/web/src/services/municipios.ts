import { supabase } from '@/lib/supabase'

export type MunicipioIbge = {
  nome: string
  uf: string
  latitude: number
  longitude: number
  distance_km: number | null
}

export async function searchMunicipiosIbge(
  query?: string,
  lat?: number | null,
  lng?: number | null,
  limit = 10,
): Promise<MunicipioIbge[]> {
  const { data, error } = await supabase.rpc('search_municipios_ibge', {
    p_query: query?.trim() || null,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
    p_limit: limit,
  })

  if (error) throw error
  return (data ?? []) as MunicipioIbge[]
}
