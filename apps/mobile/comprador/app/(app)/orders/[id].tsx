import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { BackButton } from '@/components/common/back-button'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrder, useOrderLogs, useOrderSlaDeadlines, useUpdateOrderStatus } from '@/hooks/use-orders'
import { formatDate, formatShortId } from '@/lib/utils'
import { formatSupabaseError } from '@/lib/errors'
import type { OrderStatus, OrderStatusLog, OrderSlaDeadline } from '@/services/orders'

const BUYER_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  AGUARDANDO_CONFIRMACAO_EXTERNA: { next: 'PAGAMENTO_INFORMADO', label: 'Informar pagamento' },
  ENVIO_INFORMADO: { next: 'ENTREGUE', label: 'Confirmar recebimento' },
  ENTREGUE: { next: 'CONCLUIDO', label: 'Concluir pedido' },
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: order, isLoading } = useOrder(id)
  const { data: logs = [] } = useOrderLogs(id)
  const { data: slas = [] } = useOrderSlaDeadlines(id)
  const updateStatus = useUpdateOrderStatus()

  if (isLoading || !order) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  const action = BUYER_ACTIONS[order.status as OrderStatus]

  const handleAdvance = async () => {
    if (!action) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: action.next })
      Alert.alert('Atualizado', 'Status do pedido atualizado.')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  const handleCancel = () => {
    Alert.alert('Cancelar pedido', 'Deseja cancelar este pedido?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({
              id: order.id,
              status: 'CANCELADO',
              cancelReason: 'Cancelado pelo comprador',
            })
          } catch (err) {
            Alert.alert('Erro', formatSupabaseError(err))
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="p-4 pb-8">
        <BackButton className="mb-3" />
        <Text className="text-2xl font-bold text-brand-dark">Pedido #{formatShortId(order.id)}</Text>
        <View className="mt-2">
          <StatusBadge status={order.status} type="order" />
        </View>

        {action ? (
          <Button label={action.label} onPress={handleAdvance} loading={updateStatus.isPending} className="mt-4" />
        ) : null}
        {order.status !== 'CANCELADO' && order.status !== 'CONCLUIDO' ? (
          <Button label="Cancelar pedido" variant="destructive" onPress={handleCancel} className="mt-2" />
        ) : null}

        <Text className="mb-2 mt-6 text-lg font-bold text-brand-dark">Prazos (SLA)</Text>
        {slas.length === 0 ? (
          <Text className="text-slate-500">Nenhum prazo pendente.</Text>
        ) : (
          slas.map((sla: OrderSlaDeadline) => (
            <Card key={sla.id} className="mb-2">
              <Text className="font-medium text-slate-800">{sla.action}</Text>
              <Text className="text-sm text-slate-500">Até {formatDate(sla.deadline_at)} · {sla.status}</Text>
            </Card>
          ))
        )}

        <Text className="mb-2 mt-6 text-lg font-bold text-brand-dark">Histórico</Text>
        {logs.map((log: OrderStatusLog) => (
          <View key={log.id} className="mb-2 border-l-2 border-brand pl-3">
            <Text className="text-sm font-medium text-slate-800">{log.to_status}</Text>
            <Text className="text-xs text-slate-500">{formatDate(log.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
