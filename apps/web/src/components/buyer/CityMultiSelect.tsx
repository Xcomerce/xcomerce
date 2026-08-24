import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, MapPin, Navigation, X } from 'lucide-react'
import {
  type CityLocation,
  cityLocationKey,
  formatCityLocationLabel,
  formatCityLocationsLabel,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BRAZILIAN_STATES, fetchCitiesByUf } from '@/lib/brazil-locations'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  storeDetectedLocation,
  type DetectedUserLocation,
} from '@/lib/detect-user-uf'

type CityMultiSelectProps = {
  value: CityLocation[]
  onChange: (next: CityLocation[]) => void
  className?: string
  variant?: 'select' | 'link' | 'panel'
  title?: string
  description?: string
}

export function CityMultiSelect({
  value,
  onChange,
  className,
  variant = 'select',
  title = 'Localização',
  description = 'Selecione uma ou mais cidades para filtrar os resultados.',
}: CityMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [draftUf, setDraftUf] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [draftCities, setDraftCities] = useState<CityLocation[]>(value)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectedLocation] = useState<DetectedUserLocation | null>(() => getStoredDetectedLocation())
  const cityInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (variant === 'panel') {
      setDraftCities(value)
      setDraftUf(value[0]?.uf ?? detectedLocation?.uf ?? '')
      return
    }
    if (!open) return
    setDraftCities(value)
    setDraftUf(value[0]?.uf ?? detectedLocation?.uf ?? '')
    setCityQuery('')
  }, [open, value, detectedLocation?.uf, variant])

  useEffect(() => {
    if ((variant !== 'panel' && !open) || !draftUf) {
      if (!draftUf) setAvailableCities([])
      return
    }

    let cancelled = false
    setLoadingCities(true)
    void fetchCitiesByUf(draftUf)
      .then((cities) => {
        if (!cancelled) setAvailableCities(cities)
      })
      .catch(() => {
        if (!cancelled) setAvailableCities([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, draftUf, variant])

  useEffect(() => {
    if (variant === 'panel' || !open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, variant])

  const label = useMemo(() => formatCityLocationsLabel(value), [value])

  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase()
    if (!query) return availableCities.slice(0, 12)
    return availableCities.filter((city) => city.toLowerCase().includes(query)).slice(0, 12)
  }, [availableCities, cityQuery])

  function addCity(cidade: string, uf = draftUf) {
    const trimmed = cidade.trim()
    if (trimmed.length < 2 || uf.length !== 2) return
    const next: CityLocation = { cidade: trimmed, uf: uf.toUpperCase() }
    const key = cityLocationKey(next)
    if (draftCities.some((item) => cityLocationKey(item) === key)) return
    setDraftCities((prev) => [...prev, next])
    setCityQuery('')
  }

  function removeCity(target: CityLocation) {
    const key = cityLocationKey(target)
    setDraftCities((prev) => prev.filter((item) => cityLocationKey(item) !== key))
  }

  function applySelection(next: CityLocation[]) {
    onChange(next)
    if (variant !== 'panel') setOpen(false)
  }

  async function handleDetectLocation() {
    setDetecting(true)
    try {
      const location = await detectUserLocation()
      if (!location) return
      storeDetectedLocation(location)
      setDraftUf(location.uf)
      setDraftCities([{ cidade: location.cidade, uf: location.uf }])
      if (variant === 'panel') onChange([{ cidade: location.cidade, uf: location.uf }])
    } finally {
      setDetecting(false)
    }
  }

  function handleApply() {
    applySelection(draftCities)
  }

  function handleClear() {
    applySelection([])
  }

  const trigger =
    variant === 'panel' ? null : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-w-0 items-center text-left text-sm font-medium transition-colors focus:outline-none',
          variant === 'select' &&
            'h-10 gap-2 rounded-xl border border-border bg-secondary/50 px-3 text-foreground hover:bg-secondary/70 focus:ring-2 focus:ring-primary focus:ring-offset-2',
          variant === 'link' &&
            'inline-flex h-10 w-max max-w-full min-w-0 gap-1 text-primary hover:text-primary/80 focus-visible:underline underline-offset-2',
          className,
        )}
        aria-label="Alterar localização"
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className={cn('min-w-0 truncate', variant === 'select' && 'flex-1')}>{label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0',
            variant === 'link' ? 'text-primary/70' : 'text-muted-foreground',
          )}
        />
      </button>
    )

  const body = (
    <div className="space-y-4">
      {variant !== 'panel' ? (
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-center gap-2 rounded-xl"
        onClick={() => void handleDetectLocation()}
        disabled={detecting}
      >
        {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        Usar minha localização atual
      </Button>

      <div className="space-y-2">
        <label htmlFor="city-select-uf" className="text-sm font-medium text-foreground">
          Estado
        </label>
        <select
          id="city-select-uf"
          value={draftUf}
          onChange={(event) => setDraftUf(event.target.value)}
          className="h-11 w-full cursor-pointer rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <option value="">Selecione o estado</option>
          {BRAZILIAN_STATES.map((state) => (
            <option key={state.uf} value={state.uf}>
              {state.name}, {state.uf}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="city-select-query" className="text-sm font-medium text-foreground">
          Cidade
        </label>
        <Input
          ref={cityInputRef}
          id="city-select-query"
          value={cityQuery}
          onChange={(event) => setCityQuery(event.target.value)}
          placeholder={draftUf ? 'Digite para buscar a cidade' : 'Selecione um estado primeiro'}
          disabled={!draftUf}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (filteredCities[0]) addCity(filteredCities[0])
              else if (cityQuery.trim()) addCity(cityQuery)
            }
          }}
        />
        {draftUf && loadingCities ? (
          <p className="text-xs text-muted-foreground">Carregando cidades...</p>
        ) : null}
        {draftUf && filteredCities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredCities.map((city) => (
              <button
                key={city}
                type="button"
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                onClick={() => addCity(city)}
              >
                {city}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {draftCities.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Cidades selecionadas</p>
          <div className="flex flex-wrap gap-2">
            {draftCities.map((city) => (
              <span
                key={cityLocationKey(city)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {formatCityLocationLabel(city)}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-primary/10"
                  aria-label={`Remover ${formatCityLocationLabel(city)}`}
                  onClick={() => removeCity(city)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {variant === 'panel' ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={handleClear}>
            Limpar
          </Button>
          <Button type="button" className="flex-1 rounded-xl" onClick={handleApply}>
            Aplicar
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => setOpen(false)}
            disabled={detecting}
          >
            Cancelar
          </Button>
          <Button type="button" className="h-11 flex-1 rounded-xl" onClick={handleApply} disabled={detecting}>
            Aplicar
          </Button>
        </div>
      )}
    </div>
  )

  if (variant === 'panel') {
    return <div className={className}>{body}</div>
  }

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
            onClick={() => {
              if (!detecting) setOpen(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200 sm:rounded-2xl sm:pb-5 sm:slide-in-from-bottom-0 sm:zoom-in-95"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
              {body}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {trigger}
      {modal}
    </>
  )
}
