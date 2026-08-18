import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, MapPin, Navigation } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BRAZILIAN_STATES } from '@/lib/brazil-locations'
import {
  detectUserLocation,
  getStoredDetectedLocation,
  storeDetectedLocation,
  type DetectedUserLocation,
} from '@/lib/detect-user-uf'

type FeedLocationControlProps = {
  className?: string
  variant?: 'select' | 'link'
}

export function FeedLocationControl({ className, variant = 'select' }: FeedLocationControlProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUf = searchParams.get('uf') || ''
  const [open, setOpen] = useState(false)
  const [draftUf, setDraftUf] = useState(selectedUf)
  const [detectedLocation, setDetectedLocation] = useState<DetectedUserLocation | null>(() =>
    getStoredDetectedLocation(),
  )
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    setDraftUf(selectedUf)
    setDetectedLocation(getStoredDetectedLocation())
  }, [selectedUf, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])
  const label = useMemo(() => {
    if (selectedUf) {
      const state = BRAZILIAN_STATES.find((item) => item.uf === selectedUf)
      return state ? `${state.name}, ${state.uf}` : selectedUf
    }
    if (detectedLocation) {
      return `${detectedLocation.cidade}, ${detectedLocation.uf}`
    }
    return 'Todos os estados'
  }, [detectedLocation, selectedUf])

  function applyUf(uf: string, location?: DetectedUserLocation | null) {
    setSearchParams(
      (prev) => {
        if (uf) prev.set('uf', uf)
        else prev.delete('uf')
        return prev
      },
      { replace: true },
    )

    if (location) {
      storeDetectedLocation(location)
      setDetectedLocation(location)
    } else if (!uf) {
      setDetectedLocation(null)
    }

    setOpen(false)
  }

  async function handleDetectLocation() {
    setDetecting(true)
    try {
      const location = await detectUserLocation()
      if (!location) return
      setDraftUf(location.uf)
      applyUf(location.uf, location)
    } finally {
      setDetecting(false)
    }
  }

  function handleApply() {
    if (!draftUf) {
      applyUf('', null)
      return
    }

    if (detectedLocation?.uf === draftUf) {
      applyUf(draftUf, detectedLocation)
      return
    }

    applyUf(draftUf, null)
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
              aria-labelledby="feed-location-title"
              className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200 sm:rounded-2xl sm:pb-5 sm:slide-in-from-bottom-0 sm:zoom-in-95"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

              <div className="space-y-1">
                <h3 id="feed-location-title" className="font-display text-lg font-semibold text-foreground">
                  Sua localização
                </h3>
                <p className="text-sm text-muted-foreground">
                  Usamos sua localização para priorizar produtos da região. Você pode alterar quando quiser.
                </p>
              </div>

              <div className="mt-4 space-y-4">
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
                  <label htmlFor="feed-location-uf" className="text-sm font-medium text-foreground">
                    Estado
                  </label>
                  <select
                    id="feed-location-uf"
                    value={draftUf}
                    onChange={(event) => setDraftUf(event.target.value)}
                    className="h-11 w-full cursor-pointer rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <option value="">Todos os estados</option>
                    {BRAZILIAN_STATES.map((state) => (
                      <option key={state.uf} value={state.uf}>
                        {state.name}, {state.uf}
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
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

      {modal}
    </>
  )
}