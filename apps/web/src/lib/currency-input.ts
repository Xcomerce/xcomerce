const MAX_CURRENCY_DIGITS = 11 // até 999.999.999,99

/** Extrai apenas dígitos (máscara centavos). */
export function extractCurrencyDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_CURRENCY_DIGITS)
}

/** Converte centavos (string de dígitos) em valor decimal. */
export function digitsToCurrencyValue(digits: string): number {
  const clean = extractCurrencyDigits(digits)
  if (!clean) return 0
  return Number(clean) / 100
}

/** Converte valor decimal em centavos (string de dígitos). */
export function currencyValueToDigits(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return Math.round(value * 100).toString()
}

/** Formata dígitos centavos para exibição pt-BR (sempre 2 casas decimais). */
export function formatCurrencyDigits(digits: string): string {
  const clean = extractCurrencyDigits(digits)
  if (!clean) return ''

  return digitsToCurrencyValue(clean).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Normaliza colagem ou digitação com vírgula/ponto explícito para dígitos centavos. */
export function parseCurrencyToDigits(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const digitsOnly = extractCurrencyDigits(trimmed)
  const hasDecimalSeparator = /[,.]/.test(trimmed)

  if (!hasDecimalSeparator) {
    return digitsOnly
  }

  const normalized = trimmed
    .replace(/[^\d,.]/g, '')
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return digitsOnly
  }

  return Math.round(parsed * 100).toString().slice(0, MAX_CURRENCY_DIGITS)
}

/** @deprecated Use formatCurrencyDigits(currencyValueToDigits(value)) */
export function formatDecimalInput(value: number): string {
  return formatCurrencyDigits(currencyValueToDigits(value))
}

/** @deprecated Use digitsToCurrencyValue */
export function parseDecimalInput(raw: string): number {
  if (/[,.]/.test(raw)) {
    return digitsToCurrencyValue(parseCurrencyToDigits(raw))
  }
  return digitsToCurrencyValue(raw)
}

/** @deprecated Use extractCurrencyDigits / parseCurrencyToDigits */
export function sanitizeDecimalInput(raw: string): string {
  return parseCurrencyToDigits(raw)
}
