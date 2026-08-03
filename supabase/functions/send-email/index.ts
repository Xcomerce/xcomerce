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
import {
  createBrevoStub,
  createHostingerAdapter,
  createResendAdapter,
  renderTemplateString,
  sanitizeHtml,
  type EmailProviderAdapter,
} from './providers.ts'

interface SendEmailBody {
  to: string
  template: string
  locale?: string
  data: Record<string, unknown>
  idempotency_key?: string
  user_id?: string
  lead_id?: string
  provider_slug?: string
}

function pickAdapter(
  slug: string,
  config: Record<string, unknown>,
): EmailProviderAdapter {
  if (slug === 'hostinger_smtp') {
    return createHostingerAdapter({
      host: String(config.host ?? 'smtp.hostinger.com'),
      port: Number(config.port ?? 465),
      from_email: config.from_email ? String(config.from_email) : undefined,
      from_name: config.from_name ? String(config.from_name) : undefined,
    })
  }
  if (slug === 'resend') return createResendAdapter()
  if (slug === 'brevo') return createBrevoStub()
  throw new Error(`Provider desconhecido: ${slug}`)
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

  const { to, template, data, locale = 'pt-BR', idempotency_key, user_id, lead_id, provider_slug } =
    body
  if (!to || !template || !data) {
    return error('INVALID_PAYLOAD', 'Campos to, template e data são obrigatórios.', 400)
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

  const notifType = notificationTypeForTemplate(template as EmailTemplate)
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

  let subject: string
  let html: string

  const { data: dbTpl } = await supabase
    .from('email_templates')
    .select('subject, html_body, is_active')
    .eq('key', template)
    .maybeSingle()

  if (dbTpl?.is_active) {
    subject = renderTemplateString(dbTpl.subject, data)
    html = sanitizeHtml(renderTemplateString(dbTpl.html_body, data))
  } else if (EMAIL_TEMPLATES.includes(template as EmailTemplate)) {
    const rendered = renderEmail(template as EmailTemplate, data, locale)
    subject = rendered.subject
    html = sanitizeHtml(rendered.html)
  } else {
    return error('INVALID_TEMPLATE', `Template "${template}" não suportado.`, 400)
  }

  const { data: providers } = await supabase
    .from('email_providers')
    .select('slug, config, is_default, is_enabled, status')
    .order('is_default', { ascending: false })

  const chosen =
    (provider_slug && providers?.find((p) => p.slug === provider_slug)) ||
    providers?.find((p) => p.is_default && p.is_enabled && p.status === 'active') ||
    providers?.find((p) => p.is_enabled && p.status === 'active')

  if (!chosen) {
    return error('CONFIG_ERROR', 'Nenhum provider de e-mail ativo.', 500)
  }

  const fromFallback = Deno.env.get('EMAIL_FROM') ?? 'noreply@xcomerce.com.br'
  const config = (chosen.config ?? {}) as Record<string, unknown>
  const adapter = pickAdapter(chosen.slug, config)

  try {
    const resultSend = await adapter.send({
      from: String(config.from_email ?? fromFallback),
      fromName: config.from_name ? String(config.from_name) : 'XCOMERCE',
      to,
      subject,
      html,
    })

    await supabase.from('email_sends').insert({
      template_key: template,
      to_email: to,
      lead_id: lead_id ?? null,
      user_id: user_id ?? null,
      provider_slug: chosen.slug,
      status: 'sent',
      provider_message_id: resultSend.messageId,
    })

    const result = {
      sent: true,
      message_id: resultSend.messageId,
      template,
      provider: chosen.slug,
    }
    if (idempotency_key) {
      await markIdempotency(supabase, idempotency_key, 'send-email', result, 168)
    }
    return json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('send-email error:', message)
    await supabase.from('email_sends').insert({
      template_key: template,
      to_email: to,
      lead_id: lead_id ?? null,
      user_id: user_id ?? null,
      provider_slug: chosen.slug,
      status: 'failed',
      error: message.slice(0, 2000),
    })
    return error('EMAIL_SEND_FAILED', 'Falha ao enviar e-mail.', 500, { detail: message })
  }
})
