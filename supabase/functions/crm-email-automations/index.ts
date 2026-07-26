import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { validateCronSecret } from '../_shared/auth.ts'

const APP_URL = () => Deno.env.get('APP_URL') ?? 'https://app.xcomerce.com.br'
const FUNCTIONS_BASE = () =>
  `${Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '')}/functions/v1`

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  if (!validateCronSecret(req)) {
    return error('UNAUTHORIZED', 'Cron secret inválido.', 401)
  }

  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: leads, error: fetchErr } = await supabase
    .from('crm_leads')
    .select('id, email, name, status, email_opt_out, nurture_sent_at, created_at, invite_token, profile_type, unsubscribe_token')
    .is('nurture_sent_at', null)
    .eq('email_opt_out', false)
    .in('status', ['novo', 'contatado', 'qualificado'])
    .lte('created_at', cutoff)
    .limit(50)

  if (fetchErr) {
    return error('DB_ERROR', fetchErr.message, 500)
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  let sent = 0
  let skipped = 0
  let failed = 0
  const details: Record<string, unknown>[] = []

  for (const lead of leads ?? []) {
    try {
      const res = await fetch(`${FUNCTIONS_BASE()}/crm-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'nurture', lead_id: lead.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        failed += 1
        details.push({ id: lead.id, ok: false, error: body })
        continue
      }
      if (body.skipped) {
        skipped += 1
        // still mark to avoid retry loops on opt-out/status
        await supabase
          .from('crm_leads')
          .update({ nurture_sent_at: new Date().toISOString() })
          .eq('id', lead.id)
      } else if (body.sent) {
        sent += 1
      } else {
        skipped += 1
      }
      details.push({ id: lead.id, ok: true, result: body })
    } catch (err) {
      failed += 1
      details.push({
        id: lead.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return json({
    processed: leads?.length ?? 0,
    sent,
    skipped,
    failed,
    app_url: APP_URL(),
    details,
  })
})
