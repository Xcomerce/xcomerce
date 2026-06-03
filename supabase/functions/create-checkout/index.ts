import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser } from '../_shared/auth.ts'

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

interface CreateCheckoutBody {
  plan_id: string
  billing_type: BillingType
  success_url: string
  cancel_url: string
}

async function asaasRequest(path: string, init: RequestInit = {}) {
  const base = Deno.env.get('ASAAS_API_URL') ?? 'https://api.asaas.com/v3'
  const key = Deno.env.get('ASAAS_API_KEY')
  if (!key) throw new Error('ASAAS_API_KEY não configurada')

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      ...(init.headers ?? {}),
    },
  })
  return res
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const { user, response: authError } = await requireUser(req)
  if (authError) return authError

  let body: CreateCheckoutBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  const { plan_id, billing_type, success_url, cancel_url } = body
  if (!plan_id || !billing_type || !success_url || !cancel_url) {
    return error('INVALID_PAYLOAD', 'Campos obrigatórios ausentes.', 400)
  }

  const validBilling: BillingType[] = ['PIX', 'BOLETO', 'CREDIT_CARD']
  if (!validBilling.includes(billing_type)) {
    return error('INVALID_PAYLOAD', 'billing_type inválido.', 400)
  }

  const supabase = createServiceClient()

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, name, price, asaas_plan_id, is_active')
    .eq('id', plan_id)
    .maybeSingle()

  if (planErr || !plan || !plan.is_active) {
    return error('PLAN_NOT_FOUND', 'Plano não encontrado ou inativo.', 404)
  }

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('id, plan_id, status, asaas_customer_id')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (currentSub?.status === 'active' && currentSub.plan_id === plan_id) {
    return error('ALREADY_SUBSCRIBED', 'Você já possui este plano ativo.', 409)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, phone')
    .eq('id', user!.id)
    .single()

  let asaasCustomerId = currentSub?.asaas_customer_id as string | undefined

  if (!asaasCustomerId) {
    const customerRes = await asaasRequest('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: profile?.full_name ?? 'Cliente Keve',
        email: profile?.email,
        phone: profile?.phone,
        externalReference: user!.id,
      }),
    })

    if (!customerRes.ok) {
      console.error('Asaas customer:', await customerRes.text())
      return error('ASAAS_ERROR', 'Falha ao criar cliente no Asaas.', 502)
    }

    const customer = await customerRes.json()
    asaasCustomerId = customer.id as string
  }

  const nextDue = new Date()
  nextDue.setDate(nextDue.getDate() + 1)
  const nextDueDate = nextDue.toISOString().slice(0, 10)

  const subscriptionPayload: Record<string, unknown> = {
    customer: asaasCustomerId,
    billingType: billing_type,
    value: Number(plan.price),
    nextDueDate,
    cycle: 'MONTHLY',
    externalReference: `${plan_id}:${user!.id}`,
    description: `Keve — ${plan.name}`,
  }

  if (plan.asaas_plan_id) {
    subscriptionPayload.plan = { id: plan.asaas_plan_id }
  }

  const subRes = await asaasRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscriptionPayload),
  })

  if (!subRes.ok) {
    console.error('Asaas subscription:', await subRes.text())
    return error('ASAAS_ERROR', 'Falha ao criar assinatura no Asaas.', 502)
  }

  const asaasSub = await subRes.json()

  const linkRes = await asaasRequest('/paymentLinks', {
    method: 'POST',
    body: JSON.stringify({
      name: `Assinatura ${plan.name}`,
      billingType: billing_type,
      chargeType: 'RECURRENT',
      subscriptionCycle: 'MONTHLY',
      value: Number(plan.price),
      dueDateLimitDays: 3,
      customer: asaasCustomerId,
      externalReference: `${plan_id}:${user!.id}`,
      callback: {
        successUrl: success_url,
        cancelUrl: cancel_url,
        autoRedirect: true,
      },
    }),
  })

  let checkoutUrl = asaasSub.invoiceUrl as string | undefined
  let expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()

  if (linkRes.ok) {
    const link = await linkRes.json()
    checkoutUrl = (link.url ?? link.checkoutUrl) as string
    if (link.endDate) expiresAt = new Date(link.endDate).toISOString()
  }

  if (!checkoutUrl) {
    return error('ASAAS_ERROR', 'Checkout URL não retornada pelo Asaas.', 502)
  }

  await supabase.from('subscriptions').upsert(
    {
      user_id: user!.id,
      plan_id,
      status: 'trialing',
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSub.id as string,
    },
    { onConflict: 'user_id' },
  )

  return json({
    checkout_url: checkoutUrl,
    asaas_customer_id: asaasCustomerId,
    expires_at: expiresAt,
  })
})
