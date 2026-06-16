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
  const { count, error: rateError } = await supabase
    .from('idempotency_keys')
    .select('*', { count: 'exact', head: true })
    .like('key', `${prefix}%`)

  if (rateError) {
    console.error('Rate limit check failed:', rateError.message)
    return true
  }

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

const CNPJ_FETCH_TIMEOUT_MS = 15_000
const CNPJ_FETCH_RETRIES = 2

async function fetchCnpjFromApi(cnpj: string): Promise<Response> {
  const apiUrl = Deno.env.get('CNPJ_API_URL') ?? 'https://brasilapi.com.br/api/cnpj/v1'
  const token = Deno.env.get('CNPJ_API_TOKEN')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Keve-B2B/1.0',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= CNPJ_FETCH_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CNPJ_FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(`${apiUrl}/${cnpj}`, {
        signal: controller.signal,
        headers,
      })
      lastResponse = response

      if (response.ok || response.status === 404) return response
      if (response.status < 500 && response.status !== 429) return response
    } catch (err) {
      console.error(`BrasilAPI attempt ${attempt + 1} failed:`, err)
    } finally {
      clearTimeout(timeout)
    }

    if (attempt < CNPJ_FETCH_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  if (lastResponse) return lastResponse
  throw new Error('CNPJ_API_UNREACHABLE')
}

async function parseCnpjFromRequest(req: Request): Promise<string | null> {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    return normalizeCnpj(url.searchParams.get('cnpj') ?? '')
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const raw = typeof body?.cnpj === 'string' ? body.cnpj : ''
      return normalizeCnpj(raw)
    } catch {
      return null
    }
  }

  return null
}

Deno.serve(async (req) => {
  try {
    const cors = handleCors(req)
    if (cors) return cors

    if (req.method !== 'GET' && req.method !== 'POST') {
      return error('METHOD_NOT_ALLOWED', 'Use GET ou POST.', 405)
    }

    const { user, response: authError } = await requireUser(req)
    if (authError) return authError

    const cnpj = await parseCnpjFromRequest(req)
    if (!cnpj || !validateCnpjDigits(cnpj)) {
      return error('INVALID_CNPJ', 'CNPJ inválido.', 400)
    }

    const supabase = createServiceClient()

    if (!(await checkRateLimit(supabase, user!.id))) {
      return error('RATE_LIMIT_EXCEEDED', 'Limite de 10 consultas por minuto.', 429)
    }

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id, cnpj, razao_social, nome_fantasia, situacao, logradouro, bairro, cidade, uf, cep')
    .eq('cnpj', cnpj)
    .maybeSingle()

  if (existingCompany) {
    const { data: ownedProfile } = await supabase
      .from('supplier_profiles')
      .select('user_id')
      .eq('company_id', existingCompany.id)
      .eq('user_id', user!.id)
      .maybeSingle()

    if (!ownedProfile) {
      return error('CNPJ_ALREADY_REGISTERED', 'Este CNPJ já está cadastrado na plataforma.', 409)
    }

    await recordRateHit(supabase, user!.id)
    return json({
      cnpj: existingCompany.cnpj,
      razao_social: existingCompany.razao_social,
      nome_fantasia: existingCompany.nome_fantasia,
      situacao: existingCompany.situacao ?? 'ATIVA',
      endereco: {
        logradouro: existingCompany.logradouro ?? '',
        bairro: existingCompany.bairro ?? '',
        cidade: existingCompany.cidade,
        uf: existingCompany.uf,
        cep: existingCompany.cep ?? '',
      },
      cached: true,
    })
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

    let apiRes: Response
    try {
      apiRes = await fetchCnpjFromApi(cnpj)
    } catch (err) {
      console.error('BrasilAPI unreachable:', err)
      return error('CNPJ_API_ERROR', 'Serviço de consulta CNPJ indisponível. Tente novamente.', 503)
    }

    if (apiRes.status === 404) {
      return error('CNPJ_NOT_FOUND', 'CNPJ não encontrado na Receita Federal.', 404)
    }

    if (!apiRes.ok) {
      console.error('BrasilAPI error:', apiRes.status, await apiRes.text())
      return error('CNPJ_API_ERROR', 'Falha ao consultar CNPJ. Tente novamente em instantes.', 502)
    }

    const payload = await apiRes.json()
    await supabase.from('cnpj_cache').upsert({
      cnpj,
      payload,
      fetched_at: new Date().toISOString(),
    })
    await recordRateHit(supabase, user!.id)

    return json({ ...mapBrasilApi(payload, cnpj), cached: false })
  } catch (err) {
    console.error('lookup-cnpj unhandled error:', err)
    return error('INTERNAL_ERROR', 'Erro interno ao consultar CNPJ.', 500)
  }
})
