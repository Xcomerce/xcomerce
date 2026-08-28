import type { BuyerOrderCompany } from '@/services/orders'

export function formatCompanyAddress(
  company: Pick<BuyerOrderCompany, 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'uf'> | null,
): string | null {
  if (!company) return null

  const street = [company.logradouro, company.numero].filter(Boolean).join(', ')
  const cityState = [company.cidade, company.uf].filter(Boolean).join('/')

  const parts = [street, company.bairro, cityState].filter(Boolean)
  if (parts.length === 0) return null

  if (street && company.bairro) {
    return `${street} — ${company.bairro}${cityState ? `, ${cityState}` : ''}`
  }

  return parts.join(', ')
}

export function buildGoogleMapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export function toTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return digits.startsWith('55') ? `tel:+${digits}` : `tel:+55${digits}`
}
