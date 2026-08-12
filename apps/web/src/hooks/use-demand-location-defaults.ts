import { useEffect, useState } from 'react'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  storeDetectedLocation,
  type DetectedUserLocation,
} from '@/lib/detect-user-uf'
import { useBuyerAddress } from '@/hooks/use-buyer-address'

const DEFAULT_LOCATION: DetectedUserLocation & { raio_km: number } = {
  cidade: 'São Paulo',
  uf: 'SP',
  raio_km: 50,
}

export function useDemandLocationDefaults() {
  const { data: buyerAddress } = useBuyerAddress()
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolveLocation() {
      if (buyerAddress?.city?.trim() && buyerAddress.uf?.trim()) {
        if (!cancelled) {
          setLocation({
            cidade: buyerAddress.city.trim(),
            uf: buyerAddress.uf.trim().toUpperCase(),
            raio_km: 50,
          })
          setReady(true)
        }
        return
      }

      const stored = getStoredDetectedLocation()
      if (stored) {
        if (!cancelled) {
          setLocation({ ...stored, raio_km: 50 })
          setReady(true)
        }
        return
      }

      const detected = await detectUserLocation()
      if (cancelled) return

      if (detected) {
        storeDetectedLocation(detected)
        setLocation({ ...detected, raio_km: 50 })
      } else {
        setLocation(DEFAULT_LOCATION)
      }
      setReady(true)
    }

    void resolveLocation()
    return () => {
      cancelled = true
    }
  }, [buyerAddress?.city, buyerAddress?.uf])

  return { ...location, ready }
}
