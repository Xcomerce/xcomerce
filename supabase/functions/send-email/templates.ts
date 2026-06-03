export type EmailTemplate =
  | 'demand_matched'
  | 'offer_received'
  | 'chat_message'
  | 'order_status_changed'
  | 'sla_reminder'
  | 'sla_expired'
  | 'supplier_approved'
  | 'supplier_rejected'
  | 'subscription_activated'
  | 'subscription_past_due'

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  'demand_matched',
  'offer_received',
  'chat_message',
  'order_status_changed',
  'sla_reminder',
  'sla_expired',
  'supplier_approved',
  'supplier_rejected',
  'subscription_activated',
  'subscription_past_due',
]

const TEMPLATE_TO_NOTIFICATION_TYPE: Partial<Record<EmailTemplate, string>> = {
  demand_matched: 'demand.matched',
  offer_received: 'offer.received',
  chat_message: 'chat.message',
  order_status_changed: 'order.status_changed',
  sla_reminder: 'sla.reminder',
  sla_expired: 'sla.expired',
  supplier_approved: 'supplier.approved',
  supplier_rejected: 'supplier.rejected',
  subscription_activated: 'subscription.activated',
  subscription_past_due: 'subscription.past_due',
}

export function notificationTypeForTemplate(template: EmailTemplate): string | null {
  return TEMPLATE_TO_NOTIFICATION_TYPE[template] ?? null
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
}

function layout(title: string, body: string, actionUrl?: string, actionLabel = 'Abrir no Keve'): string {
  const cta = actionUrl
    ? `<p style="margin-top:24px"><a href="${esc(actionUrl)}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">${actionLabel}</a></p>`
    : ''
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.5">
    <h1 style="font-size:20px">${esc(title)}</h1>
    ${body}
    ${cta}
    <p style="margin-top:32px;font-size:12px;color:#6b7280">Keve Marketplace B2B</p>
  </body></html>`
}

export function renderEmail(
  template: EmailTemplate,
  data: Record<string, unknown>,
  locale = 'pt-BR',
): { subject: string; html: string } {
  const actionUrl = data.action_url as string | undefined

  switch (template) {
    case 'demand_matched':
      return {
        subject: locale === 'pt-BR' ? 'Nova oportunidade de demanda' : 'New demand opportunity',
        html: layout(
          'Nova demanda compatível',
          `<p>Olá ${esc(data.supplier_name)},</p>
           <p>Uma nova demanda foi publicada na sua região: <strong>${esc(data.demand_title)}</strong> (${esc(data.demand_city)}).</p>`,
          actionUrl,
          'Ver no board',
        ),
      }
    case 'offer_received':
      return {
        subject: 'Nova proposta na sua demanda',
        html: layout(
          'Proposta recebida',
          `<p>Olá ${esc(data.buyer_name)},</p>
           <p>Você recebeu <strong>${esc(data.offer_count)}</strong> proposta(s) na demanda "${esc(data.demand_title)}".</p>`,
          actionUrl,
        ),
      }
    case 'chat_message':
      return {
        subject: `Nova mensagem — ${esc(data.demand_title)}`,
        html: layout(
          'Nova mensagem',
          `<p><strong>${esc(data.sender_name)}</strong> enviou uma mensagem sobre "${esc(data.demand_title)}":</p>
           <blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#4b5563">${esc(data.preview)}</blockquote>`,
          actionUrl,
        ),
      }
    case 'order_status_changed':
      return {
        subject: `Pedido ${esc(data.order_id)} — status atualizado`,
        html: layout(
          'Status do pedido atualizado',
          `<p>O pedido <strong>${esc(data.order_id)}</strong> mudou para: <strong>${esc(data.new_status)}</strong>.</p>`,
          actionUrl,
        ),
      }
    case 'sla_reminder':
      return {
        subject: 'Lembrete de prazo SLA',
        html: layout(
          'Prazo SLA se aproximando',
          `<p>O pedido <strong>${esc(data.order_id)}</strong> exige a ação <strong>${esc(data.action_name)}</strong> até ${esc(data.deadline_at)}.</p>`,
          actionUrl,
        ),
      }
    case 'sla_expired':
      return {
        subject: 'Prazo SLA expirado',
        html: layout(
          'SLA expirado',
          `<p>O prazo para <strong>${esc(data.action_name)}</strong> no pedido <strong>${esc(data.order_id)}</strong> expirou.</p>`,
          actionUrl,
        ),
      }
    case 'supplier_approved':
      return {
        subject: 'Cadastro aprovado — Keve',
        html: layout(
          'Parabéns, você foi aprovado!',
          `<p>Olá ${esc(data.supplier_name)}, seu cadastro de fornecedor foi aprovado. Você já pode receber oportunidades de match.</p>`,
          actionUrl,
        ),
      }
    case 'supplier_rejected':
      return {
        subject: 'Atualização do seu cadastro',
        html: layout(
          'Cadastro não aprovado',
          `<p>Olá ${esc(data.supplier_name)}, infelizmente seu cadastro não foi aprovado.</p>
           <p><strong>Motivo:</strong> ${esc(data.reason)}</p>`,
          actionUrl,
        ),
      }
    case 'subscription_activated':
      return {
        subject: 'Assinatura ativada',
        html: layout(
          'Assinatura ativa',
          `<p>Seu plano <strong>${esc(data.plan_name)}</strong> está ativo. Aproveite os benefícios!</p>`,
          actionUrl,
        ),
      }
    case 'subscription_past_due':
      return {
        subject: 'Pagamento em atraso',
        html: layout(
          'Assinatura em atraso',
          `<p>O pagamento do plano <strong>${esc(data.plan_name)}</strong> está em atraso. Regularize para evitar interrupção.</p>`,
          actionUrl,
        ),
      }
    default:
      return { subject: 'Keve', html: layout('Notificação', '<p>Você tem uma nova notificação.</p>', actionUrl) }
  }
}
