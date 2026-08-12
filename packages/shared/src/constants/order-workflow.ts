export type OrderWorkflowStatus =
  | 'PROPOSTA_ACEITA'
  | 'AGUARDANDO_CONFIRMACAO_EXTERNA'
  | 'COMPROVANTE_ENVIADO'
  | 'PAGAMENTO_CONFIRMADO'
  | 'PAGAMENTO_INFORMADO'
  | 'ENVIO_INFORMADO'
  | 'ENTREGUE'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'EXPIRADO'

/** Pedidos recém-aceitos ou aguardando pagamento/comprovante (aba Aceito). */
export const ORDER_ACCEPTED_STATUSES: OrderWorkflowStatus[] = [
  'PROPOSTA_ACEITA',
  'AGUARDANDO_CONFIRMACAO_EXTERNA',
  'COMPROVANTE_ENVIADO',
]

/** Pedidos em produção após confirmação de pagamento (aba Em produção). */
export const ORDER_PRODUCTION_STATUSES: OrderWorkflowStatus[] = [
  'PAGAMENTO_CONFIRMADO',
  'PAGAMENTO_INFORMADO',
  'ENVIO_INFORMADO',
  'ENTREGUE',
]

export const ORDER_COMPLETED_STATUSES: OrderWorkflowStatus[] = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO']

export const SLA_ACTION_LABELS: Record<string, string> = {
  inform_payment: 'Informar pagamento',
  confirm_payment: 'Confirmar pagamento',
  inform_shipping: 'Informar pedido pronto',
  confirm_delivery: 'Confirmar recebimento',
  confirm_completion: 'Confirmar conclusão',
}

export function isOrderAcceptedStatus(status: string): boolean {
  return ORDER_ACCEPTED_STATUSES.includes(status as OrderWorkflowStatus)
}

export function isOrderProductionStatus(status: string): boolean {
  return ORDER_PRODUCTION_STATUSES.includes(status as OrderWorkflowStatus)
}

export function canSupplierConfirmPayment(status: string): boolean {
  return status === 'COMPROVANTE_ENVIADO' || status === 'PAGAMENTO_INFORMADO'
}
