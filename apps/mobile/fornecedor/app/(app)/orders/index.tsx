import { useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronRight, MapPin, Package, Phone, User } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/contexts/auth-context'
import { useOrders, useUpdateOrderStatus } from '@/hooks/use-orders'
import type { SupplierOrderListItem } from '@/services/orders'
import { shareOrderSummary } from '@/lib/order-share'
import { formatSupabaseError } from '@/lib/errors'
import {
  ORDER_ACCEPTED_STATUSES,
  ORDER_COMPLETED_STATUSES,
  ORDER_PRODUCTION_STATUSES,
  ORDER_STATUS_LABELS,
  canSupplierConfirmPayment,
} from '@keve/shared'
import { cn, formatCurrency, formatShortId } from '@/lib/utils'

type OrderTab = 'all' | 'accepted' | 'production' | 'completed'

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'accepted', label: 'Aceito' },
  { id: 'production', label: 'Em produção' },
  { id: 'completed', label: 'Concluído' },
]

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

function filterOrders(orders: SupplierOrderListItem[], tab: OrderTab) {
  if (tab === 'accepted') return orders.filter((o) => ORDER_ACCEPTED_STATUSES.includes(o.status))
  if (tab === 'production') return orders.filter((o) => ORDER_PRODUCTION_STATUSES.includes(o.status))
  if (tab === 'completed') return orders.filter((o) => ORDER_COMPLETED_STATUSES.includes(o.status))
  return orders
}

export default function SupplierOrdersScreen() {
  const router = useRouter()
  const { supplierStatus } = useAuth()
  const [activeTab, setActiveTab] = useState<OrderTab>('all')
  const { data: ordersData, isLoading, isError, refetch, isRefetching } = useOrders('supplier')
  const updateStatus = useUpdateOrderStatus()
  const orders = (ordersData ?? []) as SupplierOrderListItem[]

  const filteredOrders = filterOrders(orders, activeTab)

  function countForTab(tab: OrderTab) {
    return filterOrders(orders, tab).length
  }

  async function handleConfirmPayment(order: SupplierOrderListItem) {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'PAGAMENTO_CONFIRMADO' })
      Alert.alert('Sucesso', 'Pagamento confirmado')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleShare(order: SupplierOrderListItem) {
    try {
      await shareOrderSummary(order)
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o pedido.')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader
        title="Pedidos"
        subtitle="Acompanhe negociações aceitas e o andamento de cada entrega"
        supplierStatus={supplierStatus}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 py-3"
        className="max-h-14 border-b border-slate-200 bg-white"
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={cn(
              'flex-row items-center rounded-full px-4 py-2',
              activeTab === tab.id ? 'bg-brand' : 'border border-slate-200 bg-white',
            )}
          >
            <Text className={cn('text-sm font-semibold', activeTab === tab.id ? 'text-white' : 'text-slate-700')}>
              {tab.label}
            </Text>
            <View
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5',
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100',
              )}
            >
              <Text
                className={cn(
                  'text-xs font-bold',
                  activeTab === tab.id ? 'text-white' : 'text-slate-500',
                )}
              >
                {countForTab(tab.id)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Text className="p-4 text-sm text-red-600">Não foi possível carregar os pedidos.</Text>
      ) : orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido"
          description="Quando um comprador aceitar sua proposta, o pedido aparecerá aqui com valor, prazo e status."
        />
      ) : filteredOrders.length === 0 ? (
        <View className="mx-4 mt-8 items-center rounded-2xl border border-dashed border-slate-200 bg-white py-12">
          <Package size={32} color="#cbd5e1" />
          <Text className="mt-2 text-sm font-semibold text-slate-500">Nenhum pedido encontrado</Text>
          <Text className="mt-1 text-xs text-slate-400">Não há pedidos neste status no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card>
              <Pressable onPress={() => router.push(`/(app)/orders/${item.id}`)}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1 gap-2">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full border border-slate-200 px-2 py-0.5">
                        <Text className="font-mono text-xs font-semibold text-slate-800">
                          ID#{formatShortId(item.id)}
                        </Text>
                      </View>
                      <StatusBadge status={item.status} type="order" />
                    </View>

                    <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                      {item.demand?.titulo ?? `Pedido ${item.demand_id.slice(0, 8)}…`}
                    </Text>

                    {item.demand ? (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={12} color="#64748b" />
                        <Text className="text-xs text-slate-500">
                          {item.demand.cidade}/{item.demand.uf}
                          {item.offer ? ` · ${formatCurrency(item.offer.valor)}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {item.buyer ? (
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <User size={12} color="#64748b" />
                          <Text className="text-sm text-slate-600">{item.buyer.full_name}</Text>
                        </View>
                        {item.buyer.phone ? (
                          <View className="flex-row items-center gap-1.5">
                            <Phone size={12} color="#64748b" />
                            <Text className="text-sm text-slate-500">{formatPhone(item.buyer.phone)}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <Text className="text-xs text-slate-500">
                      {ORDER_STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </View>
              </Pressable>

              <View className="mt-3 flex-row flex-wrap gap-2 border-t border-slate-100 pt-3">
                {canSupplierConfirmPayment(item.status) ? (
                  <Button
                    label="Confirmar pagamento"
                    loading={updateStatus.isPending}
                    onPress={() => void handleConfirmPayment(item)}
                    className="flex-1 min-w-[140px]"
                  />
                ) : null}
                <Button
                  label="Compartilhar pedido"
                  variant="outline"
                  onPress={() => void handleShare(item)}
                  className="flex-1 min-w-[140px]"
                />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  )
}
