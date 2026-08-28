import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { formatDistanceKm, type CityLocation } from '@keve/shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { searchMunicipiosIbge, type MunicipioIbge } from '@/services/municipios'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  type DetectedUserLocation,
} from '@/lib/detect-user-uf'

type CityProximityPickerProps = {
  value: CityLocation | null
  onChange: (next: CityLocation | null) => void
  className?: string
}


export function CityProximityPicker({ value, onChange, className }: CityProximityPickerProps) {
  const [query, setQuery] = useState(value ? `${value.cidade}, ${value.uf}` : '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nearby, setNearby] = useState<MunicipioIbge[]>([])
  const [results, setResults] = useState<MunicipioIbge[]>([])
  const [detecting, setDetecting] = useState(false)
  const [detectedLocation] = useState<DetectedUserLocation | null>(() => getStoredDetectedLocation())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setQuery(`${value.cidade}, ${value.uf}`)
    }
  }, [value])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void searchMunicipiosIbge(
      query.trim() || undefined,
      detectedLocation?.latitude ?? null,
      detectedLocation?.longitude ?? null,
      query.trim() ? 10 : 5,
    )
      .then((data) => {
        if (cancelled) return
        if (query.trim()) {
          setResults(data)
        } else {
          setNearby(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([])
          setNearby([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query, detectedLocation?.latitude, detectedLocation?.longitude])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayList = useMemo(() => {
    return query.trim() ? results : nearby
  }, [query, results, nearby])

  function selectCity(city: MunicipioIbge) {
    onChange({ cidade: city.nome, uf: city.uf })
    setQuery(`${city.nome}, ${city.uf}`)
    setOpen(false)
  }

  async function handleDetectLocation() {
    setDetecting(true)
    try {
      const location = await detectUserLocation()
      if (location?.cidade && location.uf) {
        onChange({ cidade: location.cidade, uf: location.uf })
        setQuery(`${location.cidade}, ${location.uf}`)
      }
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('space-y-3', className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Ex.: Franca, SP"
          className="pl-9"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value.trim()) onChange(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (displayList[0]) selectCity(displayList[0])
            }
          }}
        />

        {open && displayList.length > 0 ? (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
            {!query.trim() ? (
              <p className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cidades mais próximas
              </p>
            ) : null}
            {displayList.map((city) => (
              <button
                key={`${city.nome}-${city.uf}`}
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
              >
                <span>
                  {city.nome}, {city.uf}
                </span>
                {city.distance_km != null ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceKm(city.distance_km)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {open && loading ? (
          <p className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
            Buscando cidades...
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={detecting}
        onClick={() => void handleDetectLocation()}
      >
        <Navigation className="h-3.5 w-3.5" />
        {detecting ? 'Detectando...' : 'Usar minha localização'}
      </Button>
    </div>
  )
}
