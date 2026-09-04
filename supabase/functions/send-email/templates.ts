export type EmailTemplate =
  | 'demand_matched'
  | 'offer_received'
  | 'chat_message'
  | 'order_status_changed'
  | 'sla_reminder'
  | 'sla_expired'
  | 'supplier_approved'
  | 'supplier_rejected'
  | 'admin_supplier_pending'
  | 'subscription_activated'
  | 'subscription_past_due'
  | 'profile_updated_by_admin'
  | 'diagnostic_threshold_alert'

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  'demand_matched',
  'offer_received',
  'chat_message',
  'order_status_changed',
  'sla_reminder',
  'sla_expired',
  'supplier_approved',
  'supplier_rejected',
  'admin_supplier_pending',
  'subscription_activated',
  'subscription_past_due',
  'profile_updated_by_admin',
  'diagnostic_threshold_alert',
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
  admin_supplier_pending: 'admin.supplier_pending',
  subscription_activated: 'subscription.activated',
  subscription_past_due: 'subscription.past_due',
  profile_updated_by_admin: 'profile.updated_by_admin',
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  full_name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  city: 'Cidade',
  uf: 'UF',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  bairro: 'Bairro',
  complemento: 'Complemento',
  store_name: 'Nome da loja',
  service_city: 'Cidade de atendimento',
  service_uf: 'UF de atendimento',
  service_radius_km: 'Raio de atendimento (km)',
  razao_social: 'Razão social',
  nome_fantasia: 'Nome fantasia',
  situacao: 'Situação cadastral',
  cnpj: 'CNPJ',
}

function renderProfileChangesList(changes: unknown): string {
  if (!Array.isArray(changes) || changes.length === 0) {
    return '<p>Alguns dados da sua conta foram atualizados.</p>'
  }
  const items = changes
    .map((item) => {
      const row = item as Record<string, unknown>
      const field = String(row.field ?? '')
      const label = PROFILE_FIELD_LABELS[field] ?? field
      return `<li><strong>${esc(label)}</strong> foi atualizado</li>`
    })
    .join('')
  return `<p>Os seguintes dados foram alterados por nossa equipe de suporte:</p><ul>${items}</ul>`
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
        subject: locale === 'pt-BR' ? 'Nova oportunidade de solicitação' : 'New request opportunity',
        html: layout(
          'Nova solicitação compatível',
          `<p>Olá ${esc(data.supplier_name)},</p>
           <p>Uma nova solicitação foi publicada na sua região: <strong>${esc(data.demand_title)}</strong> (${esc(data.demand_city)}).</p>`,
          actionUrl,
          'Ver no board',
        ),
      }
    case 'offer_received':
      return {
        subject: 'Nova proposta no seu pedido',
        html: layout(
          'Proposta recebida',
          `<p>Olá ${esc(data.buyer_name)},</p>
           <p>Você recebeu <strong>${esc(data.offer_count)}</strong> proposta(s) no pedido "${esc(data.demand_title)}".</p>`,
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
    case 'admin_supplier_pending':
      return {
        subject: 'Novo fornecedor aguardando aprovação',
        html: layout(
          'Fornecedor em revisão',
          `<p><strong>${esc(data.supplier_name)}</strong> (${esc(data.company_name)}) enviou cadastro para aprovação.</p>`,
          actionUrl,
          'Ver fila de aprovações',
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
    case 'profile_updated_by_admin':
      return {
        subject: 'Seus dados foram atualizados',
        html: layout(
          'Atualização de cadastro',
          `<p>Olá ${esc(data.user_name)},</p>
           ${renderProfileChangesList(data.changes)}
           <p>Se você não solicitou esta alteração ou não reconhece esta ação, entre em contato conosco imediatamente pelo canal de suporte.</p>`,
          actionUrl,
          'Ver meu perfil',
        ),
      }
    case 'diagnostic_threshold_alert':
      return {
        subject: `Alerta: ${esc(data.issue_label)} afetou ${esc(data.affected_users)} pessoas`,
        html: layout(
          'Alerta de diagnóstico',
          `<p>Um problema recorrente passou do limite de atenção:</p>
           <ul>
             <li><strong>${esc(data.issue_type)}</strong>: ${esc(data.issue_label)}</li>
             <li><strong>Pessoas afetadas (24h):</strong> ${esc(data.affected_users)}</li>
             <li><strong>Ocorrências totais (24h):</strong> ${esc(data.total_occurrences)}</li>
           </ul>`,
          actionUrl,
          'Abrir painel de diagnóstico',
        ),
      }
    default:
      return { subject: 'Keve', html: layout('Notificação', '<p>Você tem uma nova notificação.</p>', actionUrl) }
  }
}
