import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useDemands } from '@/hooks/use-demands'
import { formatDate } from '@/lib/utils'

export default function DemandsListScreen() {
  const router = useRouter()
  const { data: demands = [], isLoading } = useDemands()

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Ofertas" />
      {isLoading ? (
        <LoadingSkeleton />
      ) : demands.length === 0 ? (
        <EmptyState
          title="Nenhuma demanda ainda"
          description="Toque no + para solicitar uma nova oferta aos fornecedores."
        />
      ) : (
        <FlatList
          data={demands}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/demands/${item.id}`)}>
              <Card>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-base font-semibold text-slate-900">{item.titulo}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text className="mt-2 text-sm text-slate-600" numberOfLines={2}>
                  {item.descricao}
                </Text>
                <View className="mt-3 flex-row justify-between">
                  <Text className="text-xs text-slate-500">{item.cidade}/{item.uf}</Text>
                  <Text className="text-xs text-slate-500">{formatDate(item.created_at)}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}
