import { handleCors } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser } from '../_shared/auth.ts'

const CNPJ_FETCH_TIMEOUT_MS = 15_000

function mapBrasilApi(payload: Record<string, unknown>, cnpj: string) {
  const logradouroBase = String(payload.logradouro ?? '').trim()
  const numero = payload.numero ? String(payload.numero).trim() : ''
  return {
    cnpj,
    razao_social: String(payload.razao_social ?? ''),
    nome_fantasia: payload.nome_fantasia ? String(payload.nome_fantasia) : null,
    situacao: String(payload.descricao_situacao_cadastral ?? 'ATIVA'),
    logradouro: numero ? `${logradouroBase}, ${numero}`.trim() : logradouroBase,
    bairro: payload.bairro ? String(payload.bairro) : null,
    cidade: String(payload.municipio ?? ''),
    uf: String(payload.uf ?? '').slice(0, 2),
    cep: String(payload.cep ?? '').replace(/\D/g, '').slice(0, 8) || null,
  }
}

async function fetchCnpjFromApi(cnpj: string): Promise<Response> {
  const apiUrl = Deno.env.get('CNPJ_API_URL') ?? 'https://brasilapi.com.br/api/cnpj/v1'
  const token = Deno.env.get('CNPJ_API_TOKEN')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Keve-B2B/1.0',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CNPJ_FETCH_TIMEOUT_MS)
  try {
    return await fetch(`${apiUrl}/${cnpj}`, { signal: controller.signal, headers })
  } finally {
    clearTimeout(timeout)
  }
}

async function isAdminUser(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  return !!data
}

Deno.serve(async (req) => {
  try {
    const cors = handleCors(req)
    if (cors) return cors

    if (req.method !== 'POST') {
      return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
    }

    const authHeader = req.headers.get('Authorization')
    const { user, response: authError } = await requireUser(req)
    if (authError) return authError

    const service = createServiceClient()
    if (!(await isAdminUser(service, user!.id))) {
      return error('FORBIDDEN', 'Acesso restrito a administradores.', 403)
    }

    let body: { company_id?: string; target_user_id?: string; reason?: string }
    try {
      body = await req.json()
    } catch {
      return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
    }

    const companyId = body.company_id
    const targetUserId = body.target_user_id
    const reason = body.reason?.trim() ?? ''

    if (!companyId || !targetUserId || reason.length < 10) {
      return error('INVALID_PAYLOAD', 'company_id, target_user_id e reason (mín. 10 chars) são obrigatórios.', 400)
    }

    const { data: company, error: companyError } = await service
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return error('NOT_FOUND', 'Empresa não encontrada.', 404)
    }

    const apiRes = await fetchCnpjFromApi(company.cnpj)
    if (apiRes.status === 404) {
      return error('CNPJ_NOT_FOUND', 'CNPJ não encontrado na Receita Federal.', 404)
    }
    if (!apiRes.ok) {
      return error('CNPJ_API_ERROR', 'Falha ao consultar CNPJ na Receita.', 502)
    }

    const payload = await apiRes.json()
    const fresh = mapBrasilApi(payload, company.cnpj)

    await service.from('cnpj_cache').upsert({
      cnpj: company.cnpj,
      payload,
      fetched_at: new Date().toISOString(),
    })

    const fields = [
      'razao_social',
      'nome_fantasia',
      'situacao',
      'logradouro',
      'bairro',
      'cidade',
      'uf',
      'cep',
    ] as const

    const changes: { field: string; old_value: string | null; new_value: string | null }[] = []
    const updates: Record<string, string | null> = {}

    for (const field of fields) {
      const oldVal = company[field] != null ? String(company[field]) : null
      const newVal = fresh[field] != null ? String(fresh[field]) : null
      if (oldVal !== newVal) {
        changes.push({ field, old_value: oldVal, new_value: newVal })
        updates[field] = newVal
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await service
        .from('companies')
        .update(updates)
        .eq('id', companyId)

      if (updateError) {
        console.error('Company update failed:', updateError.message)
        return error('UPDATE_FAILED', 'Falha ao atualizar dados da empresa.', 500)
      }
    }

    const userClient = createUserClient(authHeader!)
    const { data: logged, error: logError } = await userClient.rpc('admin_log_company_cnpj_refresh', {
      p_target_user_id: targetUserId,
      p_company_id: companyId,
      p_changes: changes,
      p_reason: reason,
    })

    if (logError && changes.length > 0) {
      console.error('Log RPC failed:', logError.message)
    }

    return json({
      company: { ...company, ...updates },
      changes: logged ?? changes,
      refreshed: true,
    })
  } catch (err) {
    console.error('admin-refresh-cnpj error:', err)
    return error('INTERNAL_ERROR', 'Erro interno ao reconsultar CNPJ.', 500)
  }
})
