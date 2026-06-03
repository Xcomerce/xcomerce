import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser } from '../_shared/auth.ts'

const CNPJ_RATE_LIMIT = 10

function normalizeCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 14) return null
  return digits
}

function validateCnpjDigits(cnpj: string): boolean {
  if (/^(\d)\1+$/.test(cnpj)) return false
  const calc = (len: number) => {
    let sum = 0
    let pos = len - 7
    for (let i = 0; i < len; i++) {
      sum += Number(cnpj[i]) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

function mapBrasilApi(payload: Record<string, unknown>, cnpj: string) {
  return {
    cnpj,
    razao_social: payload.razao_social as string,
    nome_fantasia: payload.nome_fantasia as string | null,
    situacao: payload.descricao_situacao_cadastral as string,
    endereco: {
      logradouro: `${payload.logradouro ?? ''}${payload.numero ? `, ${payload.numero}` : ''}`.trim(),
      bairro: payload.bairro as string,
      cidade: payload.municipio as string,
      uf: payload.uf as string,
      cep: String(payload.cep ?? '').replace(/\D/g, ''),
    },
  }
}

async function checkRateLimit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60000)
  const prefix = `ratelimit:lookup-cnpj:${userId}:${minute}`
  const { count } = await supabase
    .from('idempotency_keys')
    .select('*', { count: 'exact', head: true })
    .like('key', `${prefix}%`)

  return (count ?? 0) < CNPJ_RATE_LIMIT
}

async function recordRateHit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  const minute = Math.floor(Date.now() / 60000)
  const key = `ratelimit:lookup-cnpj:${userId}:${minute}:${Date.now()}`
  const expiresAt = new Date(Date.now() + 120000).toISOString()
  await supabase.from('idempotency_keys').insert({
    key,
    scope: 'lookup-cnpj-rate',
    response: { user_id: userId },
    expires_at: expiresAt,
  })
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'GET') {
    return error('METHOD_NOT_ALLOWED', 'Use GET.', 405)
  }

  const { user, response: authError } = await requireUser(req)
  if (authError) return authError

  const url = new URL(req.url)
  const cnpj = normalizeCnpj(url.searchParams.get('cnpj') ?? '')
  if (!cnpj || !validateCnpjDigits(cnpj)) {
    return error('INVALID_CNPJ', 'CNPJ inválido.', 400)
  }

  const supabase = createServiceClient()

  if (!(await checkRateLimit(supabase, user!.id))) {
    return error('RATE_LIMIT_EXCEEDED', 'Limite de 10 consultas por minuto.', 429)
  }

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id')
    .eq('cnpj', cnpj)
    .maybeSingle()

  if (existingCompany) {
    return error('CNPJ_ALREADY_REGISTERED', 'Este CNPJ já está cadastrado na plataforma.', 409)
  }

  const { data: cached } = await supabase
    .from('cnpj_cache')
    .select('payload, fetched_at')
    .eq('cnpj', cnpj)
    .maybeSingle()

  const cacheTtlMs = 24 * 3600 * 1000
  if (cached?.payload && cached.fetched_at) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < cacheTtlMs) {
      await recordRateHit(supabase, user!.id)
      return json({ ...mapBrasilApi(cached.payload as Record<string, unknown>, cnpj), cached: true })
    }
  }

  const apiUrl = Deno.env.get('CNPJ_API_URL') ?? 'https://brasilapi.com.br/api/cnpj/v1'
  const apiRes = await fetch(`${apiUrl}/${cnpj}`, {
    headers: Deno.env.get('CNPJ_API_TOKEN')
      ? { Authorization: `Bearer ${Deno.env.get('CNPJ_API_TOKEN')}` }
      : {},
  })

  if (apiRes.status === 404) {
    return error('CNPJ_NOT_FOUND', 'CNPJ não encontrado na Receita Federal.', 404)
  }

  if (!apiRes.ok) {
    console.error('BrasilAPI error:', await apiRes.text())
    return error('CNPJ_API_ERROR', 'Falha ao consultar CNPJ.', 502)
  }

  const payload = await apiRes.json()
  await supabase.from('cnpj_cache').upsert({ cnpj, payload })
  await recordRateHit(supabase, user!.id)

  return json({ ...mapBrasilApi(payload, cnpj), cached: false })
})
