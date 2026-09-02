import type { BuyerOrderCompany } from '@/services/orders'

function formatCep(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value.trim() || null
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

export type CompanyAddressPrintLines = {
  line1: string | null
  line2: string | null
}

export function formatCompanyAddressPrintLines(
  company: Pick<BuyerOrderCompany, 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'uf' | 'cep'> | null,
): CompanyAddressPrintLines {
  if (!company) return { line1: null, line2: null }

  const street = [company.logradouro, company.numero].filter(Boolean).join(', ')
  const line1 =
    street && company.bairro
      ? `${street} — ${company.bairro}`
      : street || company.bairro || null

  const cityState = [company.cidade, company.uf].filter(Boolean).join('/')
  const cep = formatCep(company.cep)
  const line2 = cityState ? `${cityState}${cep ? ` • CEP ${cep}` : ''}` : cep ? `CEP ${cep}` : null

  return { line1, line2 }
}

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
