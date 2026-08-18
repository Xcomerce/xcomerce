export function formatNotificationTitle(title: string): string {
  return title
    .replace(/Nova oportunidade de demanda/gi, 'Nova oportunidade de solicitação')
    .replace(/Nova oportunidade de pedido/gi, 'Nova oportunidade de solicitação')
}

export function formatNotificationBody(body: string): string {
  return body
    .replace(/^Demanda compatível:/i, 'Solicitação compatível:')
    .replace(/^Pedido compatível:/i, 'Solicitação compatível:')
}
