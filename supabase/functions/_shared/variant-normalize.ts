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

export function variantArrayContains(values: string[], needle: string): boolean {
  const normalized = normalizeVariantValue(needle)
  if (!normalized) return false
  return values.some((v) => normalizeVariantValue(v) === normalized)
}

export type VariantAxis = {
  name: string
  options: string[]
  images?: Record<string, string>
}
