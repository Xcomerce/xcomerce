import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useOrders } from '@/hooks/use-orders'
import { formatDate, formatShortId } from '@/lib/utils'

export default function OrdersListScreen() {
  const router = useRouter()
  const { data: orders = [], isLoading } = useOrders('buyer')

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Pedidos" />
      {isLoading ? (
        <LoadingSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState title="Nenhum pedido" description="Aceite uma proposta para iniciar um pedido." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/orders/${item.id}`)}>
              <Card>
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-slate-900">Pedido #{formatShortId(item.id)}</Text>
                  <StatusBadge status={item.status} type="order" />
                </View>
                <Text className="mt-2 text-sm text-slate-500">{formatDate(item.created_at)}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}
