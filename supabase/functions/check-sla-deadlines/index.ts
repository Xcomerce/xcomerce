import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { validateCronSecret } from '../_shared/auth.ts'
import { invokeSendNotification } from '../_shared/internal.ts'

const SLA_ACTION_LABELS: Record<string, string> = {
  inform_payment: 'Informar pagamento',
  inform_shipping: 'Informar envio',
  confirm_delivery: 'Confirmar entrega',
  confirm_completion: 'Confirmar conclusão',
}

interface CheckSlaBody {
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

  let body: CheckSlaBody = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json()
    }
  } catch {
    body = {}
  }

  const dryRun = body.dry_run === true
  const reminderHours = Number(Deno.env.get('SLA_REMINDER_HOURS_BEFORE') ?? 4)
  const supabase = createServiceClient()
  const now = new Date()

  const { data: deadlines, error: fetchErr } = await supabase
    .from('order_sla_deadlines')
    .select(`
      id,
      order_id,
      action,
      responsible_user_id,
      deadline_at,
      status,
      reminder_sent_at,
      orders!inner (
        id,
        buyer_id,
        supplier_id,
        status
      )
    `)
    .eq('status', 'pending')

  if (fetchErr) {
    return error('DB_ERROR', fetchErr.message, 500)
  }

  const reminders: Record<string, unknown>[] = []
  const expired: Record<string, unknown>[] = []
  let remindersSent = 0
  let expiredProcessed = 0

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.keve.com.br'

  for (const deadline of deadlines ?? []) {
    const deadlineAt = new Date(deadline.deadline_at)
    const reminderAt = new Date(deadlineAt.getTime() - reminderHours * 3600 * 1000)
    const order = deadline.orders as {
      id: string
      buyer_id: string
      supplier_id: string
      status: string
    }
    const actionLabel = SLA_ACTION_LABELS[deadline.action] ?? deadline.action

    if (now >= reminderAt && !deadline.reminder_sent_at) {
      reminders.push({
        order_id: order.id,
        deadline_id: deadline.id,
        responsible_user_id: deadline.responsible_user_id,
        action: deadline.action,
      })

      if (!dryRun) {
        await invokeSendNotification({
          user_id: deadline.responsible_user_id,
          type: 'sla.reminder',
          title: 'Prazo SLA se aproximando',
          body: `Ação "${actionLabel}" no pedido vence em breve.`,
          data: {
            order_id: order.id,
            deadline_id: deadline.id,
            route: `/orders/${order.id}`,
          },
          channels: ['in_app', 'email'],
          idempotency_key: `sla-reminder-${deadline.id}`,
          email_data: {
            order_id: order.id,
            action_name: actionLabel,
            deadline_at: deadline.deadline_at,
            action_url: `${appUrl}/orders/${order.id}`,
          },
        })

        await supabase
          .from('order_sla_deadlines')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', deadline.id)

        remindersSent++
      }
    }

    if (now >= deadlineAt) {
      expired.push({
        order_id: order.id,
        deadline_id: deadline.id,
        reputation_event_created: !dryRun,
        order_status: 'EXPIRADO',
      })

      if (!dryRun) {
        await supabase.from('reputation_events').insert({
          user_id: deadline.responsible_user_id,
          order_id: order.id,
          event_type: 'sla_missed',
          metadata: {
            deadline_id: deadline.id,
            action: deadline.action,
          },
        })

        const notifyUsers = [order.buyer_id, order.supplier_id]
        for (const uid of notifyUsers) {
          await invokeSendNotification({
            user_id: uid,
            type: 'sla.expired',
            title: 'Prazo SLA expirado',
            body: `O prazo para "${actionLabel}" no pedido expirou.`,
            data: {
              order_id: order.id,
              deadline_id: deadline.id,
              route: `/orders/${order.id}`,
            },
            channels: ['in_app', 'email'],
            idempotency_key: `sla-expired-${deadline.id}-${uid}`,
            email_data: {
              order_id: order.id,
              action_name: actionLabel,
              action_url: `${appUrl}/orders/${order.id}`,
            },
          })
        }

        await supabase
          .from('order_sla_deadlines')
          .update({ status: 'expired' })
          .eq('id', deadline.id)

        await supabase
          .from('orders')
          .update({ status: 'EXPIRADO' })
          .eq('id', order.id)

        await supabase.from('order_status_logs').insert({
          order_id: order.id,
          from_status: order.status,
          to_status: 'EXPIRADO',
          notes: `SLA expirado: ${deadline.action}`,
        })

        expiredProcessed++
      }
    }
  }

  return json({
    checked_at: now.toISOString(),
    reminders_sent: dryRun ? reminders.length : remindersSent,
    expired_processed: dryRun ? expired.length : expiredProcessed,
    dry_run: dryRun,
    details: { reminders, expired },
  })
})
