import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { validateCronSecret } from '../_shared/auth.ts'

interface ExpireDemandsBody {
  dry_run?: boolean
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  if (!validateCronSecret(req)) {
    return error('UNAUTHORIZED', 'Cron secret inválido.', 401)
  }

  let body: ExpireDemandsBody = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json()
    }
  } catch {
    body = {}
  }

  const dryRun = body.dry_run === true
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: expiredDemands, error: fetchErr } = await supabase
    .from('demands')
    .select('id, buyer_id, titulo, status, expires_at')
    .in('status', ['PUBLICADA', 'OFERTAS_RECEBIDAS'])
    .lt('expires_at', now)

  if (fetchErr) {
    console.error('expire-demands fetch:', fetchErr)
    return error('FETCH_FAILED', fetchErr.message, 500)
  }

  let expiredCount = 0
  let diagnosticEvents = 0

  for (const demand of expiredDemands ?? []) {
    const { count: offerCount } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('demand_id', demand.id)

    const { count: matchCount } = await supabase
      .from('demand_matches')
      .select('id', { count: 'exact', head: true })
      .eq('demand_id', demand.id)

    if (dryRun) {
      expiredCount++
      if ((offerCount ?? 0) === 0 && (matchCount ?? 0) > 0) diagnosticEvents++
      continue
    }

    const { error: updateErr } = await supabase
      .from('demands')
      .update({ status: 'EXPIRADO' })
      .eq('id', demand.id)

    if (updateErr) {
      console.error('expire-demands update:', demand.id, updateErr)
      continue
    }

    expiredCount++

    if ((offerCount ?? 0) === 0 && (matchCount ?? 0) > 0) {
      const groupKey = `demand_expired:${demand.id}`
      const { error: logErr } = await supabase.rpc('log_diagnostic_event', {
        p_event_type: 'demand_expired_no_offer',
        p_group_key: groupKey,
        p_payload: {
          demand_id: demand.id,
          titulo: demand.titulo,
          match_count: matchCount ?? 0,
        },
        p_user_role: null,
      })
      if (logErr) console.error('expire-demands log:', logErr)
      else diagnosticEvents++
    }
  }

  return json({
    dry_run: dryRun,
    expired_count: expiredCount,
    diagnostic_events: diagnosticEvents,
  })
})
