import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { invokeSendNotification } from '../_shared/internal.ts'

type AsaasEvent =
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'SUBSCRIPTION_DELETED'
  | 'SUBSCRIPTION_UPDATED'

const EVENT_STATUS_MAP: Partial<Record<AsaasEvent, string>> = {
  PAYMENT_CONFIRMED: 'active',
  PAYMENT_OVERDUE: 'past_due',
  SUBSCRIPTION_DELETED: 'canceled',
}

interface AsaasWebhookPayload {
  event: AsaasEvent
  payment?: {
    id?: string
    customer?: string
    subscription?: string
    value?: number
    status?: string
    billingType?: string
    dueDate?: string
  }
  subscription?: {
    id?: string
    customer?: string
    status?: string
    externalReference?: string
  }
}

function addPeriodEnd(from = new Date()): string {
  const end = new Date(from)
  end.setMonth(end.getMonth() + 1)
  return end.toISOString()
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const token = req.headers.get('asaas-access-token')
  const secret = Deno.env.get('ASAAS_WEBHOOK_SECRET')
  if (!secret || token !== secret) {
    return error('UNAUTHORIZED', 'Token de webhook inválido.', 401)
  }

  let payload: AsaasWebhookPayload
  try {
    payload = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const event = payload.event
  const supabase = createServiceClient()

  const asaasSubId = payload.payment?.subscription ?? payload.subscription?.id
  const asaasCustomerId = payload.payment?.customer ?? payload.subscription?.customer

  let subscriptionQuery = supabase.from('subscriptions').select('id, user_id, plan_id, status')

  if (asaasSubId) {
    subscriptionQuery = subscriptionQuery.eq('asaas_subscription_id', asaasSubId)
  } else if (asaasCustomerId) {
    subscriptionQuery = subscriptionQuery.eq('asaas_customer_id', asaasCustomerId)
  } else {
    return json({ received: true, event, skipped: true, reason: 'no_subscription_ref' })
  }

  const { data: subscription } = await subscriptionQuery.maybeSingle()

  if (!subscription) {
    console.warn('Subscription not found for webhook', { event, asaasSubId, asaasCustomerId })
    return json({ received: true, event, skipped: true, reason: 'subscription_not_found' })
  }

  let newStatus = EVENT_STATUS_MAP[event]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (event === 'PAYMENT_CONFIRMED') {
    updates.status = 'active'
    updates.current_period_start = new Date().toISOString()
    updates.current_period_end = addPeriodEnd()
    newStatus = 'active'
  } else if (event === 'PAYMENT_OVERDUE') {
    updates.status = 'past_due'
    newStatus = 'past_due'
  } else if (event === 'SUBSCRIPTION_DELETED') {
    updates.status = 'canceled'
    updates.canceled_at = new Date().toISOString()
    newStatus = 'canceled'
  } else if (event === 'SUBSCRIPTION_UPDATED') {
    const extRef = payload.subscription?.externalReference
    if (extRef?.includes(':')) {
      const [planId] = extRef.split(':')
      if (planId) updates.plan_id = planId
    }
    newStatus = subscription.status
  }

  if (updates.status) {
    const { error: updateErr } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscription.id)

    if (updateErr) {
      console.error('subscription update:', updateErr)
      return error('DB_ERROR', updateErr.message, 500)
    }
  }

  const { data: plan } = await supabase
    .from('plans')
    .select('name')
    .eq('id', subscription.plan_id)
    .maybeSingle()

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.keve.com.br'

  if (event === 'PAYMENT_CONFIRMED') {
    await invokeSendNotification({
      user_id: subscription.user_id,
      type: 'subscription.activated',
      title: 'Assinatura ativada',
      body: `Seu plano ${plan?.name ?? ''} está ativo.`,
      data: { route: '/settings/billing' },
      channels: ['in_app', 'email'],
      idempotency_key: `sub-activated-${subscription.id}-${payload.payment?.id ?? Date.now()}`,
      email_data: { plan_name: plan?.name, action_url: `${appUrl}/settings/billing` },
    })
  }

  if (event === 'PAYMENT_OVERDUE') {
    await invokeSendNotification({
      user_id: subscription.user_id,
      type: 'subscription.past_due',
      title: 'Pagamento em atraso',
      body: `Regularize o pagamento do plano ${plan?.name ?? ''}.`,
      data: { route: '/settings/billing' },
      channels: ['in_app', 'email'],
      idempotency_key: `sub-past-due-${subscription.id}-${payload.payment?.id ?? Date.now()}`,
      email_data: { plan_name: plan?.name, action_url: `${appUrl}/settings/billing` },
    })
  }

  await supabase.from('audit_logs').insert({
    action: `asaas.${event}`,
    entity_type: 'subscriptions',
    entity_id: subscription.id,
    metadata: {
      asaas_subscription_id: asaasSubId,
      asaas_customer_id: asaasCustomerId,
      payment_id: payload.payment?.id,
      new_status: newStatus,
    },
  })

  return json({
    received: true,
    event,
    subscription_id: subscription.id,
    new_status: newStatus ?? subscription.status,
  })
})
