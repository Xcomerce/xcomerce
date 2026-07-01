import { useQuery } from '@tanstack/react-query'
import { fetchCitiesByUf } from '@/lib/brazil-locations'

export function useBrazilianCities(uf: string | undefined) {
  return useQuery({
    queryKey: ['brazilian-cities', uf],
    queryFn: () => fetchCitiesByUf(uf!),
    enabled: !!uf && uf.length === 2,
    staleTime: 1000 * 60 * 60 * 24,
  })
}
