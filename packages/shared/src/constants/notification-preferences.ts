export type NotificationPreferenceDefinition = {
  type: string
  label: string
  description: string
}

export const BUYER_NOTIFICATION_PREFERENCES: NotificationPreferenceDefinition[] = [
  {
    type: 'offer.received',
    label: 'Nova proposta recebida',
    description: 'Quando um fornecedor envia proposta em uma demanda sua.',
  },
  {
    type: 'chat.message',
    label: 'Mensagens de negociação',
    description: 'Novas mensagens no chat com fornecedores.',
  },
  {
    type: 'order.status_changed',
    label: 'Atualização de pedido',
    description: 'Mudanças de status nos seus pedidos.',
  },
  {
    type: 'sla.reminder',
    label: 'Lembrete de prazo',
    description: 'Quando uma ação sua está próxima do prazo limite.',
  },
  {
    type: 'sla.expired',
    label: 'Prazo expirado',
    description: 'Quando um prazo importante foi ultrapassado.',
  },
  {
    type: 'subscription.past_due',
    label: 'Pagamento em atraso',
    description: 'Quando há pendência no pagamento do seu plano.',
  },
  {
    type: 'subscription.activated',
    label: 'Plano ativado',
    description: 'Confirmação de ativação ou renovação do seu plano.',
  },
]

export const SUPPLIER_NOTIFICATION_PREFERENCES: NotificationPreferenceDefinition[] = [
  {
    type: 'demand.matched',
    label: 'Nova oportunidade de demanda',
    description: 'Quando uma demanda compatível é publicada na sua região.',
  },
  {
    type: 'chat.message',
    label: 'Mensagens de negociação',
    description: 'Novas mensagens no chat com compradores.',
  },
  {
    type: 'order.status_changed',
    label: 'Atualização de pedido',
    description: 'Quando um pedido muda de status ou é criado a partir da sua proposta.',
  },
  {
    type: 'offer.auto_sent',
    label: 'Proposta automática enviada',
    description: 'Confirmação quando sua auto-proposta é disparada.',
  },
  {
    type: 'sla.reminder',
    label: 'Lembrete de prazo',
    description: 'Quando uma ação sua está próxima do prazo limite.',
  },
  {
    type: 'sla.expired',
    label: 'Prazo expirado',
    description: 'Quando um prazo importante foi ultrapassado.',
  },
  {
    type: 'supplier.approved',
    label: 'Cadastro aprovado',
    description: 'Quando seu cadastro de fornecedor é aprovado.',
  },
  {
    type: 'subscription.past_due',
    label: 'Pagamento em atraso',
    description: 'Quando há pendência no pagamento do seu plano.',
  },
  {
    type: 'subscription.activated',
    label: 'Plano ativado',
    description: 'Confirmação de ativação ou renovação do seu plano.',
  },
]

export const ADMIN_NOTIFICATION_PREFERENCES: NotificationPreferenceDefinition[] = [
  {
    type: 'admin.supplier_pending',
    label: 'Fornecedor aguardando aprovação',
    description: 'Quando um novo fornecedor entra em revisão.',
  },
  {
    type: 'subscription.past_due',
    label: 'Assinatura inadimplente',
    description: 'Quando uma assinatura entra em atraso de pagamento.',
  },
  {
    type: 'subscription.activated',
    label: 'Nova assinatura ativada',
    description: 'Quando um usuário ativa ou renova um plano pago.',
  },
]
