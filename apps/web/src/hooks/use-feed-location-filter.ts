import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { serializeCityLocation } from '@keve/shared'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  isBrazilianUf,
  storeDetectedLocation,
} from '@/lib/detect-user-uf'

export function useFeedLocationFilter(enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasAttemptedRef = useRef(false)
  const hasCities = searchParams.getAll('loc').length > 0

  useEffect(() => {
    if (!enabled || hasCities || hasAttemptedRef.current) return
    hasAttemptedRef.current = true

    const applyLocation = (cidade: string, uf: string) => {
      setSearchParams(
        (prev) => {
          if (prev.getAll('loc').length > 0) return prev
          prev.delete('uf')
          prev.append('loc', serializeCityLocation({ cidade, uf }))
          return prev
        },
        { replace: true },
      )
    }

    const storedLocation = getStoredDetectedLocation()
    if (storedLocation) {
      applyLocation(storedLocation.cidade, storedLocation.uf)
      return
    }

    void detectUserLocation().then((location) => {
      if (!location || !isBrazilianUf(location.uf)) return
      storeDetectedLocation(location)
      applyLocation(location.cidade, location.uf)
    })
  }, [enabled, hasCities, setSearchParams])
}
