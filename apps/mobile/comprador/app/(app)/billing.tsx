import { Alert, FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePlans, useSubscription, useUsage } from '@/hooks/use-billing'
import { formatCurrency } from '@/lib/utils'
import type { UsageCounter } from '@/services/billing'

export default function BillingScreen() {
  const { data: plans = [], isLoading } = usePlans()
  const { data: subscription } = useSubscription()
  const { data: usage = [] } = useUsage()

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Plano e billing" />
      <View className="px-4 pb-2">
        <BackButton fallbackHref="/(app)/profile" />
      </View>
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <Card className="mb-2">
              <Text className="font-semibold text-slate-800">Assinatura atual</Text>
              <Text className="mt-1 text-slate-600">
                {subscription?.plan?.name ?? 'Free'} — {subscription?.status}
              </Text>
              {usage.map((u: UsageCounter) => (
                <Text key={u.id} className="mt-1 text-sm text-slate-500">
                  {u.counter_type}: {u.count}
                </Text>
              ))}
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <Text className="text-lg font-bold text-brand-dark">{item.name}</Text>
              <Text className="mt-1 text-2xl font-bold text-brand">{formatCurrency(item.price)}</Text>
              <Text className="mt-2 text-sm text-slate-600">
                Demandas/mês: {item.max_demands_monthly ?? '∞'} · Catálogo: {item.max_catalog_items}
              </Text>
              {subscription?.plan_id === item.id ? (
                <Text className="mt-2 text-sm font-semibold text-green-600">Plano atual</Text>
              ) : (
                <Button
                  label="Upgrade via web"
                  variant="outline"
                  className="mt-3"
                  onPress={() =>
                    Alert.alert(
                      'Checkout',
                      'O upgrade via Asaas está disponível na versão web em /settings/billing.',
                    )
                  }
                />
              )}
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  )
}
