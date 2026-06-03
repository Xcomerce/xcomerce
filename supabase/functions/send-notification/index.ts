import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { checkIdempotency, markIdempotency } from '../_shared/idempotency.ts'
import { validateServiceRole } from '../_shared/auth.ts'
import { invokeSendEmail } from '../_shared/internal.ts'
import type { EmailTemplate } from '../send-email/templates.ts'

const EMAIL_TEMPLATE_BY_TYPE: Record<string, EmailTemplate> = {
  'demand.matched': 'demand_matched',
  'offer.received': 'offer_received',
  'chat.message': 'chat_message',
  'order.status_changed': 'order_status_changed',
  'sla.reminder': 'sla_reminder',
  'sla.expired': 'sla_expired',
  'supplier.approved': 'supplier_approved',
  'supplier.rejected': 'supplier_rejected',
  'subscription.activated': 'subscription_activated',
  'subscription.past_due': 'subscription_past_due',
}

interface SendNotificationBody {
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  channels: ('in_app' | 'email' | 'push')[]
  group_key?: string
  idempotency_key?: string
  email_data?: Record<string, unknown>
}

function buildGroupedBody(original: string, count: number): string {
  const match = original.match(/(\d+)\s+nova(s)?\s+proposta/i)
  if (match) {
    return original.replace(match[0], `${count} nova${count > 1 ? 's' : ''} proposta${count > 1 ? 's' : ''}`)
  }
  if (/recebeu\s+1\s+nova/i.test(original)) {
    return original.replace(/recebeu\s+1\s+nova/i, `recebeu ${count} nova${count > 1 ? 's' : ''}`)
  }
  return `Você recebeu ${count} novas notificações. ${original}`
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

  let body: SendNotificationBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const {
    user_id,
    type,
    title,
    body: notifBody,
    data,
    channels,
    group_key,
    idempotency_key,
    email_data,
  } = body

  if (!user_id || !type || !title || !notifBody || !data || !channels?.length) {
    return error('INVALID_PAYLOAD', 'Campos obrigatórios ausentes.', 400)
  }

  const supabase = createServiceClient()

  if (idempotency_key) {
    const existing = await checkIdempotency(supabase, idempotency_key)
    if (existing?.response) {
      return json(existing.response, 200)
    }
  }

  const channelsSent = { in_app: false, email: false, push: false }
  let notificationId: string | undefined
  let grouped = false
  let groupCount = 1

  if (channels.includes('in_app')) {
    if (group_key) {
      const { data: existingGroup } = await supabase
        .from('notifications')
        .select('id, body, group_count')
        .eq('user_id', user_id)
        .eq('group_key', group_key)
        .is('read_at', null)
        .maybeSingle()

      if (existingGroup) {
        groupCount = (existingGroup.group_count ?? 1) + 1
        const newBody = buildGroupedBody(notifBody, groupCount)
        const { data: updated, error: updateErr } = await supabase
          .from('notifications')
          .update({ body: newBody, group_count: groupCount, data })
          .eq('id', existingGroup.id)
          .select('id')
          .single()

        if (updateErr) {
          return error('DB_ERROR', updateErr.message, 500)
        }

        notificationId = updated!.id
        grouped = true
        channelsSent.in_app = true
      }
    }

    if (!notificationId) {
      const { data: inserted, error: insertErr } = await supabase
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          body: notifBody,
          data,
          group_key: group_key ?? null,
          group_count: 1,
        })
        .select('id')
        .single()

      if (insertErr) {
        return error('DB_ERROR', insertErr.message, 500)
      }

      notificationId = inserted!.id
      channelsSent.in_app = true
    }
  }

  if (channels.includes('email') && !grouped) {
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('email_enabled')
      .eq('user_id', user_id)
      .eq('notification_type', type)
      .maybeSingle()

    const emailEnabled = pref?.email_enabled !== false

    if (emailEnabled) {
      const template = EMAIL_TEMPLATE_BY_TYPE[type]
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user_id)
        .single()

      if (template && profile?.email) {
        const appUrl = Deno.env.get('APP_URL') ?? 'https://app.keve.com.br'
        const emailPayload = {
          to: profile.email,
          template,
          locale: 'pt-BR',
          user_id,
          data: {
            action_url: (data.route as string) ? `${appUrl}${data.route}` : appUrl,
            ...email_data,
          },
          idempotency_key: idempotency_key ? `email-${idempotency_key}` : undefined,
        }

        const emailRes = await invokeSendEmail(emailPayload)
        if (emailRes.ok) {
          const emailResult = await emailRes.json()
          channelsSent.email = emailResult.sent === true
        }
      }
    }
  }

  if (!notificationId) {
    return error('NO_CHANNEL_DELIVERED', 'Nenhum canal in-app processado.', 422)
  }

  const result = {
    notification_id: notificationId,
    channels_sent: channelsSent,
    grouped,
    ...(grouped ? { group_count: groupCount } : {}),
  }

  if (idempotency_key) {
    await markIdempotency(supabase, idempotency_key, 'send-notification', result, 168)
  }

  return json(result)
})
