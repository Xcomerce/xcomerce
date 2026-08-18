import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  isBrazilianUf,
  storeDetectedLocation,
} from '@/lib/detect-user-uf'

export function useFeedLocationFilter(enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasAttemptedRef = useRef(false)
  const selectedUf = searchParams.get('uf') || ''

  useEffect(() => {
    if (!enabled || selectedUf || hasAttemptedRef.current) return
    hasAttemptedRef.current = true

    const applyUf = (uf: string) => {
      setSearchParams(
        (prev) => {
          if (prev.get('uf')) return prev
          prev.set('uf', uf)
          return prev
        },
        { replace: true },
      )
    }

    const storedLocation = getStoredDetectedLocation()
    if (storedLocation) {
      applyUf(storedLocation.uf)
      return
    }

    void detectUserLocation().then((location) => {
      if (!location || !isBrazilianUf(location.uf)) return
      storeDetectedLocation(location)
      applyUf(location.uf)
    })
  }, [enabled, selectedUf, setSearchParams])
}
