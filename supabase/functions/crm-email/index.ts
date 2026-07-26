import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser, validateServiceRole } from '../_shared/auth.ts'
import { invokeSendEmail } from '../_shared/internal.ts'

type CrmAction =
  | 'welcome'
  | 'invite'
  | 'test_template'
  | 'unsubscribe'
  | 'nurture' // internal / cron only

interface CrmEmailBody {
  action: CrmAction
  lead_id?: string
  template_key?: string
  to?: string
  data?: Record<string, unknown>
  unsubscribe_token?: string
}

const APP_URL = () => Deno.env.get('APP_URL') ?? 'https://app.xcomerce.com.br'

function unsubscribeUrl(token: string) {
  return `${APP_URL()}/email/unsubscribe?token=${token}`
}

function inviteUrl(token: string, profileType: string | null) {
  const role = profileType === 'supplier' ? 'supplier' : 'buyer'
  return `${APP_URL()}/auth/register/${role}?invite=${token}`
}

async function isAdminUser(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  return Boolean(data)
}

async function loadLead(leadId: string) {
  const supabase = createServiceClient()
  const { data, error: err } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle()
  if (err) throw new Error(err.message)
  return data
}

async function sendLeadEmail(opts: {
  lead: Record<string, unknown>
  template: string
  extraData?: Record<string, unknown>
  idempotencyKey?: string
}) {
  const lead = opts.lead
  if (lead.email_opt_out === true) {
    return { sent: false, skipped: true, reason: 'opt_out' }
  }
  if (lead.status === 'descartado' || lead.status === 'convertido') {
    return { sent: false, skipped: true, reason: 'status' }
  }

  const token = String(lead.unsubscribe_token ?? '')
  const data = {
    name: lead.name,
    email: lead.email,
    profile_type: lead.profile_type ?? '',
    unsubscribe_url: unsubscribeUrl(token),
    invite_url: lead.invite_token
      ? inviteUrl(String(lead.invite_token), lead.profile_type as string | null)
      : `${APP_URL()}/auth/register/${lead.profile_type === 'supplier' ? 'supplier' : 'buyer'}`,
    ...opts.extraData,
  }

  const res = await invokeSendEmail({
    to: lead.email,
    template: opts.template,
    data,
    lead_id: lead.id,
    idempotency_key: opts.idempotencyKey,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error?.message ?? body?.message ?? `send-email ${res.status}`)
  }
  return body
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  let body: CrmEmailBody
  try {
    body = await req.json()
  } catch {
    return error('INVALID_PAYLOAD', 'JSON inválido.', 400)
  }

  if (!body.action) {
    return error('INVALID_PAYLOAD', 'Campo action é obrigatório.', 400)
  }

  const supabase = createServiceClient()

  try {
    // ---- unsubscribe (público) ----
    if (body.action === 'unsubscribe') {
      if (!body.unsubscribe_token) {
        return error('INVALID_PAYLOAD', 'unsubscribe_token obrigatório.', 400)
      }
      const { data: lead, error: err } = await supabase
        .from('crm_leads')
        .update({ email_opt_out: true })
        .eq('unsubscribe_token', body.unsubscribe_token)
        .select('id')
        .maybeSingle()
      if (err) return error('DB_ERROR', err.message, 500)
      if (!lead) return error('NOT_FOUND', 'Token inválido.', 404)
      return json({ ok: true, opted_out: true })
    }

    // ---- welcome (público pós-lead, lead recente) ----
    if (body.action === 'welcome') {
      if (!body.lead_id) return error('INVALID_PAYLOAD', 'lead_id obrigatório.', 400)
      const lead = await loadLead(body.lead_id)
      if (!lead) return error('NOT_FOUND', 'Lead não encontrado.', 404)

      const createdAt = new Date(lead.created_at as string).getTime()
      if (Date.now() - createdAt > 15 * 60 * 1000) {
        return error('FORBIDDEN', 'Welcome só permitido logo após a criação do lead.', 403)
      }

      const result = await sendLeadEmail({
        lead,
        template: 'crm_lead_welcome',
        idempotencyKey: `crm-welcome-${lead.id}`,
      })
      return json(result)
    }

    // ---- actions que exigem admin ou service role ----
    const isService = validateServiceRole(req)
    let adminId: string | null = null
    if (!isService) {
      const auth = await requireUser(req)
      if (auth.response) return auth.response
      if (!(await isAdminUser(auth.user!.id))) {
        return error('FORBIDDEN', 'Apenas admin.', 403)
      }
      adminId = auth.user!.id
    }

    if (body.action === 'invite') {
      if (!body.lead_id) return error('INVALID_PAYLOAD', 'lead_id obrigatório.', 400)
      let lead = await loadLead(body.lead_id)
      if (!lead) return error('NOT_FOUND', 'Lead não encontrado.', 404)
      if (lead.email_opt_out) {
        return error('OPTED_OUT', 'Lead optou por não receber e-mails.', 422)
      }

      let inviteToken = lead.invite_token as string | null
      if (!inviteToken) {
        inviteToken = crypto.randomUUID().replace(/-/g, '')
        const { data: updated, error: updErr } = await supabase
          .from('crm_leads')
          .update({
            invite_token: inviteToken,
            invite_sent_at: new Date().toISOString(),
            status: lead.status === 'novo' ? 'contatado' : lead.status,
            assigned_to: lead.assigned_to ?? adminId,
          })
          .eq('id', lead.id)
          .select('*')
          .single()
        if (updErr) return error('DB_ERROR', updErr.message, 500)
        lead = updated
      } else {
        await supabase
          .from('crm_leads')
          .update({
            invite_sent_at: new Date().toISOString(),
            status: lead.status === 'novo' ? 'contatado' : lead.status,
          })
          .eq('id', lead.id)
        lead = { ...lead, invite_sent_at: new Date().toISOString() }
      }

      const result = await sendLeadEmail({
        lead,
        template: 'crm_lead_invite',
        extraData: {
          invite_url: inviteUrl(inviteToken!, lead.profile_type as string | null),
        },
        idempotencyKey: `crm-invite-${lead.id}-${Date.now()}`,
      })
      return json({
        ...result,
        invite_url: inviteUrl(inviteToken!, lead.profile_type as string | null),
        invite_token: inviteToken,
      })
    }

    if (body.action === 'test_template') {
      if (!body.template_key || !body.to) {
        return error('INVALID_PAYLOAD', 'template_key e to são obrigatórios.', 400)
      }
      const sample = {
        name: 'Teste',
        email: body.to,
        profile_type: 'buyer',
        supplier_name: 'Fornecedor Teste',
        buyer_name: 'Comprador Teste',
        demand_title: 'Demanda de teste',
        demand_city: 'São Paulo',
        offer_count: 2,
        sender_name: 'Sistema',
        preview: 'Mensagem de teste',
        order_id: 'ORD-TEST',
        new_status: 'em_andamento',
        action_name: 'Informar pagamento',
        deadline_at: new Date().toLocaleString('pt-BR'),
        reason: 'Motivo de teste',
        plan_name: 'Plano Pro',
        action_url: APP_URL(),
        invite_url: `${APP_URL()}/auth/register/buyer`,
        unsubscribe_url: `${APP_URL()}/email/unsubscribe?token=test`,
        ...(body.data ?? {}),
      }
      const res = await invokeSendEmail({
        to: body.to,
        template: body.template_key,
        data: sample,
        idempotency_key: `crm-test-${body.template_key}-${Date.now()}`,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        return error('EMAIL_SEND_FAILED', payload?.error?.message ?? 'Falha no envio de teste.', 500)
      }
      return json(payload)
    }

    if (body.action === 'nurture') {
      if (!isService) return error('FORBIDDEN', 'Ação interna.', 403)
      if (!body.lead_id) return error('INVALID_PAYLOAD', 'lead_id obrigatório.', 400)
      const lead = await loadLead(body.lead_id)
      if (!lead) return error('NOT_FOUND', 'Lead não encontrado.', 404)
      const result = await sendLeadEmail({
        lead,
        template: 'crm_lead_nurture_d3',
        idempotencyKey: `crm-nurture-${lead.id}`,
      })
      await supabase
        .from('crm_leads')
        .update({ nurture_sent_at: new Date().toISOString() })
        .eq('id', lead.id)
      return json(result)
    }

    return error('INVALID_PAYLOAD', `Ação desconhecida: ${body.action}`, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('crm-email error:', message)
    return error('CRM_EMAIL_FAILED', message, 500)
  }
})
