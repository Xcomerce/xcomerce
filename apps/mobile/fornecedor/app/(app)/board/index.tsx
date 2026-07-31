import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Eye, MapPin } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatsBar } from '@/components/common/StatsBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuth } from '@/contexts/auth-context'
import { useMatches, useMarkMatchViewed } from '@/hooks/use-matches'
import type { DemandMatchWithDemand } from '@/services/matches'
import type { DemandMatch } from '@/services/matches'
import { cn, formatDate, formatExpiresAt, formatReceivedAt } from '@/lib/utils'

type StatusFilter = 'all' | DemandMatch['status']

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'notified', label: 'Novas' },
  { value: 'viewed', label: 'Visualizadas' },
  { value: 'offer_sent', label: 'Com proposta' },
  { value: 'dismissed', label: 'Dispensadas' },
]

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800'
  if (score >= 50) return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

function MatchCard({
  match,
  onPress,
  onMarkViewed,
  marking,
}: {
  match: DemandMatchWithDemand
  onPress: () => void
  onMarkViewed: () => void
  marking: boolean
}) {
  const demand = match.demand
  if (!demand) return null

  const isProposalAccepted = demand.status === 'PROPOSTA_ACEITA'
  const hasOfferSent = match.status === 'offer_sent'
  const actionLabel = isProposalAccepted
    ? 'Ver pedido'
    : hasOfferSent
      ? 'Ver proposta'
      : 'Enviar proposta'

  const expiresInfo =
    demand.status === 'EXPIRADO'
      ? { label: 'Expirada', isExpired: true, isUrgent: false }
      : isProposalAccepted || demand.status === 'CANCELADO'
        ? null
        : formatExpiresAt(demand.expires_at)

  return (
    <Pressable onPress={onPress}>
      <Card className={cn(match.status === 'notified' && 'border-brand/30 bg-brand/[0.02]')}>
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-slate-900" numberOfLines={2}>
            {demand.titulo}
          </Text>
          <View className={cn('rounded-full px-2 py-0.5', scoreColor(match.score).split(' ')[0])}>
            <Text className={cn('text-xs font-bold', scoreColor(match.score).split(' ')[1])}>
              {match.score}% match
            </Text>
          </View>
        </View>

        <View className="mt-2 flex-row items-center gap-1">
          <MapPin size={12} color="#64748b" />
          <Text className="text-xs text-slate-600">
            {demand.cidade}/{demand.uf} · raio {demand.raio_km} km
          </Text>
        </View>

        <View className="mt-1 flex-row flex-wrap gap-x-3 gap-y-1">
          <Text className="text-xs font-medium text-slate-700">
            {demand.quantidade} {demand.unidade}
          </Text>
          {demand.prazo_desejado ? (
            <Text className="text-xs text-slate-500">Prazo: {formatDate(demand.prazo_desejado)}</Text>
          ) : null}
        </View>

        <View className="mt-1 flex-row flex-wrap items-center gap-1">
          {expiresInfo ? (
            <>
              <Text
                className={cn(
                  'text-[11px] font-medium',
                  expiresInfo.isExpired && 'text-red-600',
                  expiresInfo.isUrgent && !expiresInfo.isExpired && 'text-amber-700',
                )}
              >
                {expiresInfo.label}
              </Text>
              <Text className="text-[11px] text-slate-400">·</Text>
            </>
          ) : null}
          <Text className="text-[11px] text-slate-500">{formatReceivedAt(match.notified_at)}</Text>
        </View>

        <Text className="mt-2 text-sm leading-relaxed text-slate-600" numberOfLines={3}>
          {demand.descricao}
        </Text>

        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <StatusBadge status={demand.status} type="demand" />
          {match.status === 'notified' ? (
            <View className="rounded-full bg-brand/10 px-2 py-0.5">
              <Text className="text-xs font-semibold text-brand">Nova</Text>
            </View>
          ) : null}
          {hasOfferSent && !isProposalAccepted ? (
            <View className="rounded-full bg-emerald-100 px-2 py-0.5">
              <Text className="text-xs font-semibold text-emerald-700">Proposta enviada</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-3 flex-row gap-2">
          {match.status === 'notified' ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.()
                onMarkViewed()
              }}
              disabled={marking}
              className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <Eye size={18} color="#64748b" />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Button
              label={actionLabel}
              variant={isProposalAccepted || hasOfferSent ? 'outline' : 'primary'}
              onPress={onPress}
            />
          </View>
        </View>
      </Card>
    </Pressable>
  )
}

function countByStatus(matches: DemandMatchWithDemand[], status: StatusFilter) {
  if (status === 'all') return matches.length
  return matches.filter((m) => m.status === status).length
}

export default function BoardScreen() {
  const router = useRouter()
  const { supplierStatus } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: allMatches = [], isLoading, isError, refetch, isRefetching } = useMatches()
  const markViewed = useMarkMatchViewed()

  const matches = useMemo(() => {
    if (statusFilter === 'all') return allMatches
    return allMatches.filter((m: DemandMatchWithDemand) => m.status === statusFilter)
  }, [allMatches, statusFilter])

  const stats = useMemo(
    () => [
      { label: 'Total', value: allMatches.length, tone: 'default' as const },
      { label: 'Novas', value: countByStatus(allMatches, 'notified'), tone: 'brand' as const },
      { label: 'Com proposta', value: countByStatus(allMatches, 'offer_sent'), tone: 'success' as const },
      {
        label: 'Visualizadas',
        value: countByStatus(allMatches, 'viewed'),
        tone: 'muted' as const,
      },
    ],
    [allMatches],
  )

  const handleMatchPress = (match: DemandMatchWithDemand) => {
    const demand = match.demand
    if (!demand) return
    if (demand.status === 'PROPOSTA_ACEITA') {
      router.push('/(app)/orders')
      return
    }
    router.push(`/(app)/offers/${demand.id}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader
        title="Oportunidades"
        subtitle="Demandas compatíveis com seu perfil e catálogo"
        supplierStatus={supplierStatus}
      />
      {!isLoading && allMatches.length > 0 ? <StatsBar items={stats} /> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 py-3"
        className="max-h-14 border-b border-slate-200 bg-white"
      >
        {STATUS_FILTERS.map((f) => {
          const count = countByStatus(allMatches, f.value)
          return (
            <Pressable
              key={f.value}
              onPress={() => setStatusFilter(f.value)}
              className={cn(
                'flex-row items-center rounded-full px-4 py-2',
                statusFilter === f.value ? 'bg-brand' : 'border border-slate-200 bg-white',
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  statusFilter === f.value ? 'text-white' : 'text-slate-700',
                )}
              >
                {f.label}
              </Text>
              {count > 0 ? (
                <View
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5',
                    statusFilter === f.value ? 'bg-white/20' : 'bg-slate-100',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      statusFilter === f.value ? 'text-white' : 'text-slate-500',
                    )}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <Text className="p-4 text-sm text-red-600">Não foi possível carregar as oportunidades.</Text>
      ) : matches.length === 0 ? (
        <EmptyState
          title="Nenhuma oportunidade"
          description={
            statusFilter === 'all'
              ? 'Novas demandas aparecerão aqui quando houver match com seu perfil.'
              : 'Não há oportunidades neste filtro no momento.'
          }
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              marking={markViewed.isPending}
              onPress={() => handleMatchPress(item)}
              onMarkViewed={() => {
                if (item.status === 'notified') markViewed.mutate(item.id)
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}
