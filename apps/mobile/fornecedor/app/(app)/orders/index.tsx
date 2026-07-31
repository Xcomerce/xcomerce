import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronRight, MapPin, Package } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/contexts/auth-context'
import { useOrders } from '@/hooks/use-orders'
import type { SupplierOrderListItem } from '@/services/orders'
import { cn, formatCurrency, formatShortId } from '@/lib/utils'

type OrderTab = 'all' | 'accepted' | 'production' | 'completed'

const ACCEPTED_STATUSES = ['PROPOSTA_ACEITA', 'AGUARDANDO_CONFIRMACAO_EXTERNA']
const PRODUCTION_STATUSES = ['PAGAMENTO_INFORMADO', 'ENVIO_INFORMADO', 'ENTREGUE']
const COMPLETED_STATUSES = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO']

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'accepted', label: 'Aceito' },
  { id: 'production', label: 'Em produção' },
  { id: 'completed', label: 'Concluído' },
]

function filterOrders(orders: SupplierOrderListItem[], tab: OrderTab) {
  if (tab === 'accepted') return orders.filter((o) => ACCEPTED_STATUSES.includes(o.status))
  if (tab === 'production') return orders.filter((o) => PRODUCTION_STATUSES.includes(o.status))
  if (tab === 'completed') return orders.filter((o) => COMPLETED_STATUSES.includes(o.status))
  return orders
}

export default function SupplierOrdersScreen() {
  const router = useRouter()
  const { supplierStatus } = useAuth()
  const [activeTab, setActiveTab] = useState<OrderTab>('all')
  const { data: ordersData, isLoading, isError, refetch, isRefetching } = useOrders('supplier')
  const orders = (ordersData ?? []) as SupplierOrderListItem[]

  const filteredOrders = filterOrders(orders, activeTab)

  function countForTab(tab: OrderTab) {
    return filterOrders(orders, tab).length
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
            <Pressable onPress={() => router.push(`/(app)/orders/${item.id}`)}>
              <Card>
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

                    {item.demand ? (
                      <>
                        <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                          {item.demand.titulo}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <MapPin size={12} color="#64748b" />
                          <Text className="text-xs text-slate-500">
                            {item.demand.cidade}/{item.demand.uf}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text className="text-sm text-slate-500">Demanda {item.demand_id.slice(0, 8)}…</Text>
                    )}

                    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                      {item.offer ? (
                        <>
                          <Text className="text-sm font-bold text-brand-dark">
                            {formatCurrency(item.offer.valor)}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            {item.offer.quantidade} {item.demand?.unidade ?? 'un'} ·{' '}
                            {item.offer.prazo_entrega_dias}{' '}
                            {item.offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}
