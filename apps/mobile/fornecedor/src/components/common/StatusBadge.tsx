import { Text, View } from 'react-native'
import { DEMAND_STATUS_LABELS, ORDER_STATUS_LABELS } from '@keve/shared'

const statusColors: Record<string, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  PUBLICADA: 'bg-blue-100 text-blue-700',
  OFERTAS_RECEBIDAS: 'bg-purple-100 text-purple-700',
  EM_NEGOCIACAO: 'bg-amber-100 text-amber-700',
  PROPOSTA_ACEITA: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
  EXPIRADO: 'bg-slate-100 text-slate-500',
  enviada: 'bg-blue-100 text-blue-700',
  aceita: 'bg-green-100 text-green-700',
  rejeitada: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status, type = 'demand' }: { status: string; type?: 'demand' | 'order' }) {
  const labels = type === 'order' ? ORDER_STATUS_LABELS : DEMAND_STATUS_LABELS
  const label = (labels as Record<string, string>)[status] ?? status
  const color = statusColors[status] ?? 'bg-slate-100 text-slate-700'

  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${color.split(' ')[0]}`}>
      <Text className={`text-xs font-semibold ${color.split(' ')[1]}`}>{label}</Text>
    </View>
  )
}
