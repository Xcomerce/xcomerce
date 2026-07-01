export type CepAddress = {
  cidade: string
  uf: string
  logradouro: string
  bairro: string
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) return null

  const data = (await res.json()) as {
    erro?: boolean
    localidade?: string
    uf?: string
    logradouro?: string
    bairro?: string
  }

  if (data.erro || !data.localidade || !data.uf) return null

  return {
    cidade: data.localidade,
    uf: data.uf,
    logradouro: data.logradouro ?? '',
    bairro: data.bairro ?? '',
  }
}
