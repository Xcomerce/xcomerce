import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { validateCronSecret } from '../_shared/auth.ts'
import { invokeSendEmail } from '../_shared/internal.ts'

const EVENT_TYPE_LABELS: Record<string, string> = {
  search_no_result: 'Busca sem resultado',
  category_not_found: 'Categoria não encontrada',
  variant_value_new: 'Cor ou tamanho novo',
  demand_no_match: 'Solicitação sem fornecedor compatível',
  demand_expired_no_offer: 'Solicitação expirada sem proposta',
  product_form_abandoned: 'Cadastro de produto abandonado',
  server_error_500: 'Erro de servidor (500)',
  upload_failure: 'Falha de upload',
  request_timeout: 'Requisição expirou',
  client_js_error: 'Erro JavaScript no navegador',
}

interface CheckDiagnosticAlertsBody {
  dry_run?: boolean
  threshold?: number
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

  let body: CheckDiagnosticAlertsBody = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json()
    }
  } catch {
    body = {}
  }

  const dryRun = body.dry_run === true
  const threshold = body.threshold ?? 5
  const supabase = createServiceClient()
  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.keve.com.br'

  const { data: candidates, error: fetchErr } = await supabase.rpc(
    'fetch_diagnostic_alert_candidates',
    { p_threshold: threshold, p_window_hours: 24 },
  )

  if (fetchErr) {
    console.error('check-diagnostic-alerts fetch:', fetchErr)
    return error('FETCH_FAILED', fetchErr.message, 500)
  }

  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id, profiles!inner(email, full_name)')
    .eq('role', 'admin')

  const adminEmails = (admins ?? [])
    .map((row) => {
      const profile = row.profiles as { email?: string; full_name?: string } | null
      return profile?.email?.trim() ?? ''
    })
    .filter(Boolean)

  if (adminEmails.length === 0) {
    return json({ dry_run: dryRun, alerts_sent: 0, reason: 'no_admin_emails' })
  }

  let alertsSent = 0

  for (const item of candidates ?? []) {
    const issueType = EVENT_TYPE_LABELS[item.event_type] ?? item.event_type
    const issueLabel = item.label ?? item.group_key
    const actionUrl = `${appUrl}/admin/diagnostics?group=${encodeURIComponent(item.group_key)}`

    if (!dryRun) {
      for (const email of adminEmails) {
        const res = await invokeSendEmail({
          to: email,
          template: 'diagnostic_threshold_alert',
          data: {
            issue_type: issueType,
            issue_label: issueLabel,
            affected_users: String(item.affected_users),
            total_occurrences: String(item.total_occurrences),
            action_url: actionUrl,
          },
          idempotency_key: `diag-alert-${item.group_key}-${new Date().toISOString().slice(0, 10)}`,
        })
        if (!res.ok) {
          console.error('check-diagnostic-alerts email:', email, res.status)
        }
      }

      await supabase.from('diagnostic_alert_sent').insert({
        group_key: item.group_key,
        event_type: item.event_type,
        affected_users: item.affected_users,
      })
    }

    alertsSent++
  }

  return json({
    dry_run: dryRun,
    threshold,
    candidates: candidates?.length ?? 0,
    alerts_sent: alertsSent,
  })
})
