import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type CityLocation,
  parseCityLocationsFromParams,
  serializeCityLocation,
} from '@keve/shared'

export function useFeedCityFilter() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cities = useMemo(
    () => parseCityLocationsFromParams(searchParams.getAll('loc')),
    [searchParams],
  )

  const setCities = useCallback(
    (next: CityLocation[]) => {
      setSearchParams(
        (prev) => {
          prev.delete('loc')
          prev.delete('uf')
          next.forEach((city) => {
            prev.append('loc', serializeCityLocation(city))
          })
          return prev
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { cities, setCities }
}
