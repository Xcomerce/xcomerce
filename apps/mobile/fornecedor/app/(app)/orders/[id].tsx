import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { BackButton } from '@/components/common/back-button'
import { DetailField, DetailGrid, SectionCard } from '@/components/common/DetailField'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrder, useOrderLogs, useUpdateOrderStatus } from '@/hooks/use-orders'
import { useDemand } from '@/hooks/use-demands'
import { useOfferDetail } from '@/hooks/use-offers'
import { useCategories, type Category } from '@/hooks/use-categories'
import type { OrderStatus } from '@/services/orders'
import { ORDER_STATUS_LABELS } from '@keve/shared'
import { cn, formatCurrency, formatDateTime, formatShortId } from '@/lib/utils'
import { formatSupabaseError } from '@/lib/errors'

const SUPPLIER_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }[]>> = {
  PROPOSTA_ACEITA: [{ next: 'AGUARDANDO_CONFIRMACAO_EXTERNA', label: 'Aguardar confirmação externa' }],
  PAGAMENTO_INFORMADO: [{ next: 'ENVIO_INFORMADO', label: 'Informar envio' }],
  ENTREGUE: [{ next: 'CONCLUIDO', label: 'Confirmar conclusão' }],
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <DetailField label={label} value={value} />
}

export default function SupplierOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const { data: order, isLoading } = useOrder(id)
  const { data: logs = [] } = useOrderLogs(id)
  const { data: demand } = useDemand(order?.demand_id)
  const { data: offer } = useOfferDetail(order?.offer_id)
  const { data: categoriesData } = useCategories()
  const categories: Category[] = categoriesData ?? []
  const updateStatus = useUpdateOrderStatus()

  if (isLoading || !order) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  const actions = SUPPLIER_ACTIONS[order.status as OrderStatus] ?? []
  const canCancel = order.status !== 'CANCELADO' && order.status !== 'CONCLUIDO'
  const categoryName = categories.find((c) => c.id === demand?.category_id)?.name

  async function handleStatus(next: OrderStatus) {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: next })
      Alert.alert('Sucesso', 'Status atualizado')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleCancel() {
    if (!id || !cancelReason.trim()) {
      Alert.alert('Cancelamento', 'Informe o motivo do cancelamento')
      return
    }
    try {
      await updateStatus.mutateAsync({
        id,
        status: 'CANCELADO',
        cancelReason: cancelReason.trim(),
      })
      Alert.alert('Sucesso', 'Pedido cancelado')
      setShowCancel(false)
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  const timeline = [...logs].reverse()

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-32">
        <BackButton className="mb-1" fallbackHref="/(app)/orders" />
        <Text className="text-2xl font-bold text-brand-dark">Pedido #{formatShortId(order.id)}</Text>
        <SectionCard title="Resumo do pedido" action={<StatusBadge status={order.status} type="order" />}>
          {demand ? (
            <View className="mb-4">
              <Text className="font-semibold text-slate-900">{demand.titulo}</Text>
              <Text className="mt-1 text-sm leading-relaxed text-slate-600">{demand.descricao}</Text>
            </View>
          ) : null}
          <DetailGrid>
            <SummaryItem label="Categoria" value={categoryName ?? '—'} />
            <SummaryItem label="Localização" value={demand ? `${demand.cidade}/${demand.uf}` : '—'} />
            <SummaryItem
              label="Quantidade"
              value={offer && demand ? `${offer.quantidade} ${demand.unidade}` : offer ? String(offer.quantidade) : '—'}
            />
            <SummaryItem label="Valor total" value={offer ? formatCurrency(offer.valor) : '—'} />
            <SummaryItem
              label="Prazo de entrega"
              value={
                offer
                  ? `${offer.prazo_entrega_dias} ${offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}`
                  : '—'
              }
            />
            <SummaryItem label="Status" value={ORDER_STATUS_LABELS[order.status] ?? order.status} />
            <SummaryItem label="Pedido criado em" value={formatDateTime(order.created_at)} />
            {order.completed_at ? (
              <SummaryItem label="Concluído em" value={formatDateTime(order.completed_at)} />
            ) : null}
          </DetailGrid>
          {offer?.mensagem ? (
            <View className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Mensagem da proposta
              </Text>
              <Text className="mt-1 text-sm leading-relaxed text-slate-700">{offer.mensagem}</Text>
            </View>
          ) : null}
          {order.cancel_reason ? (
            <View className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                Motivo do cancelamento
              </Text>
              <Text className="mt-1 text-sm text-red-800">{order.cancel_reason}</Text>
            </View>
          ) : null}
          {demand ? (
            <Button
              label="Ver demanda original"
              variant="outline"
              className="mt-4"
              onPress={() => router.push(`/(app)/offers/${demand.id}`)}
            />
          ) : null}
        </SectionCard>

        <SectionCard title="Histórico de status">
          {timeline.length === 0 ? (
            <Text className="text-sm text-slate-500">Sem registros ainda.</Text>
          ) : (
            timeline.map((log, index) => {
              const isLatest = index === 0
              const statusLabel = ORDER_STATUS_LABELS[log.to_status] ?? log.to_status
              return (
                <View key={log.id} className="mb-4 flex-row gap-3 last:mb-0">
                  <View
                    className={cn(
                      'mt-1 h-3 w-3 rounded-full',
                      isLatest ? 'bg-brand' : 'bg-slate-300',
                    )}
                  />
                  <View className="flex-1">
                    <Text className={cn('text-sm', isLatest ? 'font-bold text-slate-900' : 'font-medium text-slate-600')}>
                      {statusLabel}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">{formatDateTime(log.created_at)}</Text>
                    {log.notes ? (
                      <Text className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {log.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )
            })
          )}
        </SectionCard>
      </ScrollView>

      {(actions.length > 0 || canCancel) && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
          {showCancel ? (
            <View className="mb-3 gap-2">
              <Input
                label="Motivo do cancelamento"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Descreva o motivo..."
              />
              <View className="flex-row gap-2">
                <Button label="Confirmar cancelamento" variant="destructive" onPress={handleCancel} />
                <Button
                  label="Voltar"
                  variant="outline"
                  onPress={() => {
                    setShowCancel(false)
                    setCancelReason('')
                  }}
                />
              </View>
            </View>
          ) : null}
          {actions.map((action) => (
            <Button
              key={action.next}
              label={action.label}
              loading={updateStatus.isPending}
              onPress={() => handleStatus(action.next)}
              className="mb-2"
            />
          ))}
          {canCancel ? (
            <Button
              label={showCancel ? 'Fechar cancelamento' : 'Cancelar pedido'}
              variant="outline"
              onPress={() => setShowCancel((open) => !open)}
            />
          ) : null}
        </View>
      )}
    </SafeAreaView>
  )
}
