import { useQuery } from '@tanstack/react-query'
import { fetchCitiesByUf } from '@/lib/brazil-locations'

export function useBrazilianCities(uf: string | undefined) {
  const normalizedUf = uf?.trim().toUpperCase()

  return useQuery({
    queryKey: ['brazilian-cities', normalizedUf],
    queryFn: () => fetchCitiesByUf(normalizedUf!),
    enabled: Boolean(normalizedUf && normalizedUf.length === 2),
    staleTime: 1000 * 60 * 60 * 24,
  })
}
