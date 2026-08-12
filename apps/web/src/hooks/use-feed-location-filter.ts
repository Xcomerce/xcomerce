import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { detectUserUf, getStoredDetectedUf, isBrazilianUf, storeDetectedUf } from '@/lib/detect-user-uf'

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

    const storedUf = getStoredDetectedUf()
    if (storedUf) {
      applyUf(storedUf)
      return
    }

    void detectUserUf().then((uf) => {
      if (!isBrazilianUf(uf)) return
      storeDetectedUf(uf)
      applyUf(uf)
    })
  }, [enabled, selectedUf, setSearchParams])
}
