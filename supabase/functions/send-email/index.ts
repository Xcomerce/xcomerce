import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { checkIdempotency, markIdempotency } from '../_shared/idempotency.ts'
import { validateServiceRole } from '../_shared/auth.ts'
import {
  EMAIL_TEMPLATES,
  notificationTypeForTemplate,
  renderEmail,
  type EmailTemplate,
} from './templates.ts'

interface SendEmailBody {
  to: string
  template: EmailTemplate
  locale?: string
  data: Record<string, unknown>
  idempotency_key?: string
  user_id?: string
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

  let body: SendEmailBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const { to, template, data, locale = 'pt-BR', idempotency_key, user_id } = body
  if (!to || !template || !data) {
    return error('INVALID_PAYLOAD', 'Campos to, template e data são obrigatórios.', 400)
  }

  if (!EMAIL_TEMPLATES.includes(template)) {
    return error('INVALID_TEMPLATE', `Template "${template}" não suportado.`, 400)
  }

  const supabase = createServiceClient()

  if (idempotency_key) {
    const existing = await checkIdempotency(supabase, idempotency_key)
    if (existing?.response) {
      return json(existing.response, 200)
    }
    if (existing) {
      return error('ALREADY_PROCESSED', 'Requisição já em processamento.', 409)
    }
  }

  const notifType = notificationTypeForTemplate(template)
  if (notifType) {
    let targetUserId = user_id
    if (!targetUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', to)
        .maybeSingle()
      targetUserId = profile?.id
    }
    if (targetUserId) {
      const { data: pref } = await supabase
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', targetUserId)
        .eq('notification_type', notifType)
        .maybeSingle()
      if (pref && pref.email_enabled === false) {
        const skipped = { sent: false, skipped: true, reason: 'user_opted_out', template }
        if (idempotency_key) {
          await markIdempotency(supabase, idempotency_key, 'send-email', skipped, 24)
        }
        return json(skipped, 422)
      }
    }
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'noreply@keve.com.br'
  if (!resendKey) {
    return error('CONFIG_ERROR', 'RESEND_API_KEY não configurada.', 500)
  }

  const { subject, html } = renderEmail(template, data, locale)

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error('Resend error:', errText)
    return error('EMAIL_SEND_FAILED', 'Falha ao enviar e-mail.', 500, { status: resendRes.status })
  }

  const resendData = await resendRes.json()
  const result = {
    sent: true,
    message_id: resendData.id as string,
    template,
  }

  if (idempotency_key) {
    await markIdempotency(supabase, idempotency_key, 'send-email', result, 168)
  }

  return json(result)
})
