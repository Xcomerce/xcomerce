import { useEffect, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { BackButton } from '@/components/common/back-button'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/contexts/auth-context'
import { useOrder, useOrderLogs, useOrderSlaDeadlines, useUpdateOrderStatus } from '@/hooks/use-orders'
import {
  createOrderAttachment,
  fetchOrderAttachments,
  type OrderAttachment,
  type OrderStatus,
  type OrderStatusLog,
  type OrderSlaDeadline,
} from '@/services/orders'
import { orderAttachmentPath, uploadFileFromUri } from '@/lib/storage'
import { formatDate, formatShortId } from '@/lib/utils'
import { formatSupabaseError } from '@/lib/errors'
import { ORDER_STATUS_LABELS, SLA_ACTION_LABELS } from '@keve/shared'

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { data: order, isLoading } = useOrder(id)
  const { data: logs = [] } = useOrderLogs(id)
  const { data: slas = [] } = useOrderSlaDeadlines(id)
  const updateStatus = useUpdateOrderStatus()
  const [attachments, setAttachments] = useState<OrderAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchOrderAttachments(id)
      .then(setAttachments)
      .catch(() => undefined)
  }, [id, order?.status])

  if (isLoading || !order) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  async function handleUploadPaymentProof() {
    if (!user || !order) return

    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const fileName = asset.name ?? `comprovante-${Date.now()}`
    const contentType = asset.mimeType ?? 'application/octet-stream'

    setUploading(true)
    try {
      const path = orderAttachmentPath(user.id, order.id, fileName)
      await uploadFileFromUri('order-attachments', path, asset.uri, contentType)
      await createOrderAttachment({
        orderId: order.id,
        uploadedBy: user.id,
        attachmentType: 'payment_proof',
        storagePath: path,
        fileName,
        mimeType: contentType,
      })
      await updateStatus.mutateAsync({ id: order.id, status: 'COMPROVANTE_ENVIADO' })
      Alert.alert('Sucesso', 'Comprovante enviado. Aguardando confirmação do fornecedor.')
      const updated = await fetchOrderAttachments(order.id)
      setAttachments(updated)
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirmDelivery() {
    if (!order) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'ENTREGUE' })
      Alert.alert('Sucesso', 'Recebimento confirmado')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleConfirmCompletion() {
    if (!order) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'CONCLUIDO' })
      Alert.alert('Sucesso', 'Pedido concluído')
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

  const isTerminal = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(order.status)
  const paymentProofs = attachments.filter((a) => a.attachment_type === 'payment_proof')

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="p-4 pb-8">
        <BackButton className="mb-3" />
        <Text className="text-2xl font-bold text-brand-dark">Pedido #{formatShortId(order.id)}</Text>
        <View className="mt-2">
          <StatusBadge status={order.status} type="order" />
        </View>

        <Card className="mt-4">
          <Text className="mb-2 text-base font-bold text-brand-dark">Próximas ações</Text>

          {order.status === 'AGUARDANDO_CONFIRMACAO_EXTERNA' ? (
            <View className="gap-2">
              <Text className="text-sm text-slate-600">
                Realize o pagamento externamente e anexe o comprovante para avançar.
              </Text>
              <Button
                label="Enviar comprovante de pagamento"
                loading={uploading || updateStatus.isPending}
                onPress={() => void handleUploadPaymentProof()}
              />
            </View>
          ) : null}

          {order.status === 'COMPROVANTE_ENVIADO' ? (
            <Text className="text-sm text-slate-600">
              Comprovante enviado. Aguardando o fornecedor confirmar o pagamento.
            </Text>
          ) : null}

          {order.status === 'PAGAMENTO_CONFIRMADO' ? (
            <Text className="text-sm text-slate-600">
              Pagamento confirmado pelo fornecedor. Aguardando informações de envio.
            </Text>
          ) : null}

          {order.status === 'ENVIO_INFORMADO' ? (
            <Button
              label="Confirmar recebimento"
              loading={updateStatus.isPending}
              onPress={() => void handleConfirmDelivery()}
              className="mt-2"
            />
          ) : null}

          {order.status === 'ENTREGUE' ? (
            <Button
              label="Confirmar conclusão do pedido"
              loading={updateStatus.isPending}
              onPress={() => void handleConfirmCompletion()}
              className="mt-2"
            />
          ) : null}

          {isTerminal ? (
            <Text className="text-sm text-slate-500">Este pedido está encerrado.</Text>
          ) : null}
        </Card>

        {paymentProofs.length > 0 ? (
          <View className="mt-4">
            <Text className="mb-2 text-lg font-bold text-brand-dark">Comprovantes</Text>
            {paymentProofs.map((attachment) => (
              <Card key={attachment.id} className="mb-2">
                <Text className="font-medium text-slate-800">{attachment.file_name}</Text>
                <Text className="text-sm text-slate-500">{formatDate(attachment.created_at)}</Text>
              </Card>
            ))}
          </View>
        ) : null}

        {!isTerminal ? (
          <Button label="Cancelar pedido" variant="destructive" onPress={handleCancel} className="mt-4" />
        ) : null}

        <Text className="mb-2 mt-6 text-lg font-bold text-brand-dark">Prazos (SLA)</Text>
        {slas.length === 0 ? (
          <Text className="text-slate-500">Nenhum prazo pendente.</Text>
        ) : (
          slas.map((sla: OrderSlaDeadline) => (
            <Card key={sla.id} className="mb-2">
              <Text className="font-medium text-slate-800">
                {SLA_ACTION_LABELS[sla.action] ?? sla.action}
              </Text>
              <Text className="text-sm text-slate-500">
                Até {formatDate(sla.deadline_at)} · {sla.status}
              </Text>
            </Card>
          ))
        )}

        <Text className="mb-2 mt-6 text-lg font-bold text-brand-dark">Histórico</Text>
        {[...logs].reverse().map((log: OrderStatusLog) => (
          <View key={log.id} className="mb-2 border-l-2 border-brand pl-3">
            <Text className="text-sm font-medium text-slate-800">
              {ORDER_STATUS_LABELS[log.to_status as OrderStatus] ?? log.to_status}
            </Text>
            <Text className="text-xs text-slate-500">{formatDate(log.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
