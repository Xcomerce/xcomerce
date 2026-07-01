import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Mail, Phone } from 'lucide-react-native'
import { BackButton } from '@/components/common/back-button'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ChatThread } from '@/components/chat/ChatThread'
import { useDemand } from '@/hooks/use-demands'
import { useOffersForDemand, useAcceptOffer, useRejectOffer, useRevealContact } from '@/hooks/use-offers'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatSupabaseError } from '@/lib/errors'
import type { PublicOffer } from '@/services/offers'

export default function DemandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: demand, isLoading } = useDemand(id)
  const { data: offers = [] } = useOffersForDemand(id)
  const acceptOffer = useAcceptOffer()
  const rejectOffer = useRejectOffer()
  const revealContact = useRevealContact()
  const [chatSupplierId, setChatSupplierId] = useState<string | null>(null)

  if (isLoading || !demand) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  const handleAccept = async (offerId: string) => {
    Alert.alert('Confirmar', 'Aceitar esta proposta? As demais serão encerradas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aceitar',
        onPress: async () => {
          try {
            const order = await acceptOffer.mutateAsync(offerId)
            router.push(`/(app)/orders/${order.id}`)
          } catch (err) {
            Alert.alert('Erro', formatSupabaseError(err))
          }
        },
      },
    ])
  }

  const handleReveal = async (offerId: string) => {
    try {
      await revealContact.mutateAsync(offerId)
      Alert.alert('Contato revelado', 'Telefone e e-mail do fornecedor estão visíveis.')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  const renderOffer = (offer: PublicOffer) => (
    <Card key={offer.id} className="mb-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-slate-900">{offer.supplier_name ?? 'Fornecedor'}</Text>
        <Text className="text-lg font-bold text-brand">{formatCurrency(offer.valor)}</Text>
      </View>
      <Text className="mt-1 text-sm text-slate-500">
        Prazo: {offer.prazo_entrega_dias} dias · Qtd: {offer.quantidade}
      </Text>
      {offer.mensagem ? <Text className="mt-2 text-sm text-slate-600">{offer.mensagem}</Text> : null}
      {offer.contact_revealed ? (
        <View className="mt-2 rounded-lg bg-slate-50 p-2">
          <View className="flex-row items-center gap-2">
            <Phone size={14} color="#334155" />
            <Text className="text-sm text-slate-700">{offer.supplier_phone ?? '—'}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <Mail size={14} color="#334155" />
            <Text className="text-sm text-slate-700">{offer.supplier_email ?? '—'}</Text>
          </View>
        </View>
      ) : null}
      <View className="mt-3 flex-row flex-wrap gap-2">
        {offer.status === 'enviada' ? (
          <>
            <Button label="Aceitar" onPress={() => handleAccept(offer.id)} className="flex-1" />
            <Button label="Rejeitar" variant="outline" onPress={() => rejectOffer.mutate(offer.id)} className="flex-1" />
          </>
        ) : null}
        {!offer.contact_revealed ? (
          <Button label="Revelar contato" variant="secondary" onPress={() => handleReveal(offer.id)} />
        ) : null}
        <Button label="Chat" variant="outline" onPress={() => setChatSupplierId(offer.supplier_id)} />
      </View>
    </Card>
  )

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="p-4 pb-8">
        <BackButton className="mb-3" />
        <Text className="text-2xl font-bold text-brand-dark">{demand.titulo}</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <StatusBadge status={demand.status} />
          <Text className="text-sm text-slate-500">{formatDate(demand.created_at)}</Text>
        </View>
        <Text className="mt-3 text-slate-700">{demand.descricao}</Text>
        <Text className="mt-2 text-sm text-slate-500">
          {demand.quantidade} {demand.unidade} · {demand.cidade}/{demand.uf} · raio {demand.raio_km}km
        </Text>

        <Text className="mb-3 mt-6 text-lg font-bold text-brand-dark">
          Propostas ({offers.length})
        </Text>
        {offers.length === 0 ? (
          <Text className="text-slate-500">Aguardando propostas dos fornecedores...</Text>
        ) : (
          offers.map(renderOffer)
        )}

        {chatSupplierId ? (
          <View className="mt-6 h-96">
            <Text className="mb-2 font-semibold text-brand-dark">Chat</Text>
            <ChatThread
              demandId={demand.id}
              supplierId={chatSupplierId}
              recipientId={chatSupplierId}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
