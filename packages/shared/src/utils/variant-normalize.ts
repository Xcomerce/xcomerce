/** Normalização de valores de variação: minúsculo, sem acento, espaços colapsados. */

const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
  À: 'a', Á: 'a', Â: 'a', Ã: 'a', Ä: 'a',
  È: 'e', É: 'e', Ê: 'e', Ë: 'e',
  Ì: 'i', Í: 'i', Î: 'i', Ï: 'i',
  Ò: 'o', Ó: 'o', Ô: 'o', Õ: 'o', Ö: 'o',
  Ù: 'u', Ú: 'u', Û: 'u', Ü: 'u',
  Ç: 'c', Ñ: 'n',
}

function removeAccents(text: string): string {
  return text.replace(/[^\u0000-\u007E]/g, (char) => ACCENT_MAP[char] ?? char.normalize('NFD').replace(/\p{M}/gu, ''))
}

export function normalizeVariantValue(value: string): string {
  return removeAccents(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function variantValuesEqual(a: string, b: string): boolean {
  return normalizeVariantValue(a) === normalizeVariantValue(b)
}

export function dedupeVariantValues(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeVariantValue(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export function variantArrayContains(values: string[], needle: string): boolean {
  const normalized = normalizeVariantValue(needle)
  if (!normalized) return false
  return values.some((v) => normalizeVariantValue(v) === normalized)
}

/** Extrai raiz de cor para bloquear fuzzy cross-color (ex: "azul" ≠ "azul marinho"). */
export function extractColorRoot(value: string): string {
  const normalized = normalizeVariantValue(value)
  const firstToken = normalized.split(' ')[0] ?? ''
  return firstToken
}

export function isSameColorFamily(a: string, b: string): boolean {
  return extractColorRoot(a) === extractColorRoot(b)
}

export function isStrictPrefixMatch(query: string, candidate: string): boolean {
  const q = normalizeVariantValue(query)
  const c = normalizeVariantValue(candidate)
  if (!q || !c) return false
  if (q === c) return true
  return c.startsWith(`${q} `)
}
