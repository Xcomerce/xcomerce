export const SUPPORT_CONTACT_SETTINGS_ID = 1

export const DEFAULT_SUPPORT_HOURS = 'Seg–Sex, 9h às 18h (BRT)'

export type SupportContactSettings = {
  id: number
  email: string | null
  whatsapp: string | null
  horario: string | null
  updated_at: string
}

export function formatSupportHours(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function normalizeWhatsApp(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

export function formatWhatsAppDisplay(value: string | null | undefined): string {
  const digits = normalizeWhatsApp(value)
  if (!digits) return ''

  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4)
    const part1 = digits.slice(4, 9)
    const part2 = digits.slice(9)
    return `+55 (${ddd}) ${part1}-${part2}`
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const part1 = digits.slice(2, 7)
    const part2 = digits.slice(7)
    return `(${ddd}) ${part1}-${part2}`
  }

  return digits
}

export function buildWhatsAppUrl(value: string | null | undefined): string | null {
  const digits = normalizeWhatsApp(value)
  return digits ? `https://wa.me/${digits}` : null
}

export function buildMailtoUrl(
  email: string | null | undefined,
  options?: { subject?: string; body?: string },
): string | null {
  const trimmed = email?.trim()
  if (!trimmed) return null

  const params = new URLSearchParams()
  if (options?.subject) params.set('subject', options.subject)
  if (options?.body) params.set('body', options.body)
  const query = params.toString()
  return query ? `mailto:${trimmed}?${query}` : `mailto:${trimmed}`
}
