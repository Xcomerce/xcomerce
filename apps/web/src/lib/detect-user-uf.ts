import { BRAZILIAN_STATES } from '@/lib/brazil-locations'

export type BrazilianUf = (typeof BRAZILIAN_STATES)[number]['uf']

const VALID_UFS = new Set<string>(BRAZILIAN_STATES.map((state) => state.uf))
const DETECTED_UF_STORAGE_KEY = 'keve-detected-uf'
const DETECTED_LOCATION_STORAGE_KEY = 'keve-detected-location'

export type DetectedUserLocation = {
  cidade: string
  uf: string
  latitude?: number
  longitude?: number
}

export function normalizeGeocodedCityName(cidade: string): string {
  let normalized = cidade.trim()
  if (!normalized) return normalized

  const metroMatch = normalized.match(/^regi[aã]o metropolitana\s+(?:de|do|da|dos|das)\s+(.+)$/i)
  if (metroMatch?.[1]) {
    normalized = metroMatch[1].trim()
  }

  const regionMatch = normalized.match(/^regi[aã]o\s+(?:de|do|da|dos|das)\s+(.+)$/i)
  if (regionMatch?.[1]) {
    normalized = regionMatch[1].trim()
  }

  return normalized
}

function normalizeDetectedLocation(location: DetectedUserLocation): DetectedUserLocation {
  return {
    cidade: normalizeGeocodedCityName(location.cidade),
    uf: location.uf.toUpperCase(),
  }
}

export function isBrazilianUf(value: string | null | undefined): value is BrazilianUf {
  return Boolean(value && VALID_UFS.has(value.toUpperCase()))
}

export function getStoredDetectedUf(): string | null {
  try {
    const stored = sessionStorage.getItem(DETECTED_UF_STORAGE_KEY)
    return isBrazilianUf(stored) ? stored : null
  } catch {
    return null
  }
}

export function storeDetectedUf(uf: string): void {
  try {
    sessionStorage.setItem(DETECTED_UF_STORAGE_KEY, uf)
  } catch {
    // ignore storage errors
  }
}

export function getStoredDetectedLocation(): DetectedUserLocation | null {
  try {
    const stored = sessionStorage.getItem(DETECTED_LOCATION_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as DetectedUserLocation
    if (!parsed.cidade?.trim() || !isBrazilianUf(parsed.uf)) return null
    return normalizeDetectedLocation({ cidade: parsed.cidade.trim(), uf: parsed.uf.toUpperCase() })
  } catch {
    return null
  }
}

export function storeDetectedLocation(location: DetectedUserLocation): void {
  try {
    const normalized = normalizeDetectedLocation(location)
    sessionStorage.setItem(DETECTED_LOCATION_STORAGE_KEY, JSON.stringify(normalized))
    storeDetectedUf(normalized.uf)
  } catch {
    // ignore storage errors
  }
}

function readLocationFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<DetectedUserLocation | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', 'pt')

  return fetch(url.toString())
    .then(async (response) => {
      if (!response.ok) return null
      const data = (await response.json()) as {
        city?: string
        locality?: string
        principalSubdivisionCode?: string
      }
      const code = data.principalSubdivisionCode
      if (!code?.startsWith('BR-')) return null
      const uf = code.slice(3).toUpperCase()
      if (!isBrazilianUf(uf)) return null
      const rawCity = data.locality?.trim() || data.city?.trim()
      if (!rawCity) return null
      return normalizeDetectedLocation({ cidade: rawCity, uf })
    })
    .catch(() => null)
}

export function detectUserLocation(): Promise<DetectedUserLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void readLocationFromCoordinates(position.coords.latitude, position.coords.longitude).then(
          (location) => {
            if (!location) {
              resolve(null)
              return
            }
            const withCoords: DetectedUserLocation = {
              ...location,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
            storeDetectedLocation(withCoords)
            resolve(withCoords)
          },
        )
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
    )
  })
}

export function detectUserUf(): Promise<string | null> {
  return detectUserLocation().then((location) => location?.uf ?? null)
}
