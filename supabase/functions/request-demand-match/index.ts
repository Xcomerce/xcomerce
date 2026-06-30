import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser } from '../_shared/auth.ts'
import { runDemandMatch } from '../_shared/match-engine.ts'

interface RequestDemandMatchBody {
  demand_id: string
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const { user, response: authError } = await requireUser(req)
  if (authError) return authError

  let body: RequestDemandMatchBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  if (!body.demand_id) {
    return error('INVALID_PAYLOAD', 'demand_id é obrigatório.', 400)
  }

  const supabase = createServiceClient()

  const { data: demand, error: demandErr } = await supabase
    .from('demands')
    .select('id, buyer_id, status')
    .eq('id', body.demand_id)
    .maybeSingle()

  if (demandErr || !demand) {
    return error('DEMAND_NOT_FOUND', 'Demanda não encontrada.', 404)
  }

  if (demand.buyer_id !== user!.id) {
    return error('FORBIDDEN', 'Sem permissão para esta demanda.', 403)
  }

  try {
    const result = await runDemandMatch(supabase, body.demand_id)
    return json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar match'
    if (message === 'DEMAND_NOT_OPEN') {
      return error('DEMAND_NOT_OPEN', 'Demanda não está aberta para match.', 422)
    }
    console.error('request-demand-match:', err)
    return error('MATCH_FAILED', message, 500)
  }
})
