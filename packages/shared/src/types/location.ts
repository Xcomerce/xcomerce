export type CityLocation = {
  cidade: string
  uf: string
}

export function normalizeCityKey(cidade: string, uf: string): string {
  return `${cidade.trim().toLowerCase()}|${uf.trim().toUpperCase()}`
}

export function cityLocationKey(location: CityLocation): string {
  return normalizeCityKey(location.cidade, location.uf)
}

export function parseCityLocationsFromParams(values: string[]): CityLocation[] {
  const seen = new Set<string>()
  const result: CityLocation[] = []

  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const [cidadePart, ufPart] = trimmed.split('|')
    const cidade = (cidadePart ?? '').trim()
    const uf = (ufPart ?? '').trim().toUpperCase()
    if (cidade.length < 2 || uf.length !== 2) continue
    const key = normalizeCityKey(cidade, uf)
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ cidade, uf })
  }

  return result
}

export function serializeCityLocation(location: CityLocation): string {
  return `${location.cidade}|${location.uf}`
}

export function formatCityLocationLabel(location: CityLocation): string {
  return `${location.cidade}, ${location.uf}`
}

export function formatCityLocationsLabel(locations: CityLocation[]): string {
  if (locations.length === 0) return 'Todos os estados'
  if (locations.length === 1) return formatCityLocationLabel(locations[0])
  if (locations.length === 2) {
    return `${formatCityLocationLabel(locations[0])} e ${formatCityLocationLabel(locations[1])}`
  }
  return `${formatCityLocationLabel(locations[0])} +${locations.length - 1}`
}
