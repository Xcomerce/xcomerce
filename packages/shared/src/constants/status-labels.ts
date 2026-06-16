export const DEMAND_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADA: 'Publicada',
  OFERTAS_RECEBIDAS: 'Ofertas recebidas',
  EM_NEGOCIACAO: 'Em negociação',
  PROPOSTA_ACEITA: 'Proposta aceita',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  enviada: 'Enviada',
  aceita: 'Aceita',
  rejeitada: 'Rejeitada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PROPOSTA_ACEITA: 'Proposta aceita',
  AGUARDANDO_CONFIRMACAO_EXTERNA: 'Aguardando confirmação',
  PAGAMENTO_INFORMADO: 'Pagamento informado',
  ENVIO_INFORMADO: 'Envio informado',
  ENTREGUE: 'Entregue',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
}

export const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  'demand.matched': 'Nova oportunidade de demanda',
  'offer.received': 'Nova proposta recebida',
  'offer.auto_sent': 'Proposta automática enviada',
  'offer.contact_revealed': 'Contato revelado',
  'chat.message': 'Nova mensagem',
  'order.status_changed': 'Status do pedido alterado',
  'sla.reminder': 'Lembrete de prazo',
  'sla.expired': 'Prazo expirado',
  'supplier.approved': 'Cadastro aprovado',
  'supplier.rejected': 'Cadastro recusado',
  'subscription.activated': 'Assinatura ativada',
  'subscription.past_due': 'Pagamento em atraso',
  'admin.supplier_pending': 'Fornecedor aguardando aprovação',
}
