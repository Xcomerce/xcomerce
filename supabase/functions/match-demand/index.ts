import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { checkIdempotency, markIdempotency } from '../_shared/idempotency.ts'
import { validateServiceRole } from '../_shared/auth.ts'
import { runDemandMatch } from '../_shared/match-engine.ts'

interface MatchDemandBody {
  demand_id: string
  idempotency_key?: string
  rematch?: boolean
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  if (!validateServiceRole(req)) {
    return error('FORBIDDEN', 'Acesso restrito a chamadas internas.', 403)
  }

  const started = Date.now()
  let body: MatchDemandBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const { demand_id, idempotency_key, rematch = false } = body
  if (!demand_id) {
    return error('INVALID_PAYLOAD', 'demand_id é obrigatório.', 400)
  }

  const supabase = createServiceClient()
  const idemKey = idempotency_key ?? `demand-${demand_id}-publish`

  if (!rematch) {
    const existing = await checkIdempotency(supabase, idemKey)
    if (existing?.response) {
      return json(existing.response, 200)
    }
    if (existing) {
      return error('ALREADY_PROCESSED', 'Match já em processamento.', 409)
    }
  }

  try {
    const result = await runDemandMatch(supabase, demand_id)
    const payload = { ...result, processing_ms: Date.now() - started }

    if (!rematch) {
      await markIdempotency(supabase, idemKey, 'match-demand', payload, 168)
    }

    return json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar match'
    if (message === 'DEMAND_NOT_FOUND') {
      return error('DEMAND_NOT_FOUND', 'Demanda não encontrada.', 404)
    }
    if (message === 'DEMAND_NOT_OPEN') {
      return error('DEMAND_NOT_PUBLISHED', 'Demanda precisa estar aberta.', 422)
    }
    console.error('match-demand:', err)
    return error('MATCH_FAILED', message, 500)
  }
})
