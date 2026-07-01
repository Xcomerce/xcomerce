import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createOfferSchema,
  getMinTotalPrice,
  getMinUnitPrice,
  OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
  type OfferInput,
} from '@keve/shared'
import { BackButton } from '@/components/common/back-button'
import { Button } from '@/components/ui/Button'
import { DetailField, DetailGrid, SectionCard } from '@/components/common/DetailField'
import { Input } from '@/components/ui/Input'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ChatThread } from '@/components/chat/ChatThread'
import { useAuth } from '@/contexts/auth-context'
import { useDemand } from '@/hooks/use-demands'
import { useCategories, type Category } from '@/hooks/use-categories'
import { useCreateOffer, useOffersForDemand } from '@/hooks/use-offers'
import { fetchDemandMarketPrice } from '@/services/pricing'
import type { PublicOffer } from '@/services/offers'
import { cn, formatCurrency, formatDate, formatExpiresAt } from '@/lib/utils'
import { formatSupabaseError } from '@/lib/errors'

export default function OfferScreen() {
  const { demandId } = useLocalSearchParams<{ demandId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [marketUnitPrice, setMarketUnitPrice] = useState<number | null>(null)

  const { data: demand, isLoading: demandLoading } = useDemand(demandId)
  const { data: categoriesData } = useCategories()
  const categories: Category[] = categoriesData ?? []
  const { data: offersData } = useOffersForDemand(demandId)
  const offers: PublicOffer[] = offersData ?? []
  const createOffer = useCreateOffer()

  const myOffer = offers.find((o) => o.supplier_id === user?.id)
  const showOfferForm = !myOffer

  const offerSchemaResolved = useMemo(() => createOfferSchema(marketUnitPrice), [marketUnitPrice])

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OfferInput>({
    resolver: zodResolver(offerSchemaResolved),
    defaultValues: {
      demand_id: demandId ?? '',
      valor: 0,
      prazo_entrega_dias: 7,
      validade_dias: 7,
      quantidade: 1,
      mensagem: '',
    },
  })

  const watchedQuantity = watch('quantidade')
  const minUnitPrice = marketUnitPrice != null && marketUnitPrice > 0 ? getMinUnitPrice(marketUnitPrice) : null
  const minTotalPrice =
    minUnitPrice != null && watchedQuantity > 0
      ? getMinTotalPrice(marketUnitPrice!, watchedQuantity)
      : null

  const categoryName = categories.find((c) => c.id === demand?.category_id)?.name
  const expiresInfo = demand ? formatExpiresAt(demand.expires_at) : null

  useEffect(() => {
    if (demandId) setValue('demand_id', demandId)
    if (demand) setValue('quantidade', demand.quantidade)
  }, [demandId, demand, setValue])

  useEffect(() => {
    if (!demandId) return
    let cancelled = false
    fetchDemandMarketPrice(demandId)
      .then((price) => {
        if (!cancelled) setMarketUnitPrice(price)
      })
      .catch(() => {
        if (!cancelled) setMarketUnitPrice(null)
      })
    return () => {
      cancelled = true
    }
  }, [demandId, demand?.preco_referencia_mercado, demand?.category_id])

  async function onSubmit(values: OfferInput) {
    try {
      await createOffer.mutateAsync(values)
      Alert.alert('Sucesso', 'Proposta enviada')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  if (demandLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  if (!demand) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-slate-500">Demanda não encontrada.</Text>
        <Button label="Voltar ao mural" className="mt-4" onPress={() => router.replace('/(app)/board')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-32">
        <BackButton fallbackHref="/(app)/board" />
        <View>
          <Text className="text-2xl font-bold text-brand-dark">{demand.titulo}</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade} · raio {demand.raio_km} km
          </Text>
        </View>

        <SectionCard
          title="Demanda"
          action={<StatusBadge status={demand.status} type="demand" />}
        >
          <Text className="text-sm leading-relaxed text-slate-700">{demand.descricao}</Text>
          <DetailGrid className="mt-4">
            <DetailField label="Categoria" value={categoryName ?? '—'} />
            <DetailField label="Quantidade" value={`${demand.quantidade} ${demand.unidade}`} />
            <DetailField label="Localização" value={`${demand.cidade}/${demand.uf}`} />
            <DetailField label="Raio de entrega" value={`${demand.raio_km} km`} />
            <DetailField label="Prazo desejado" value={formatDate(demand.prazo_desejado)} />
            {demand.published_at ? (
              <DetailField label="Publicada em" value={formatDate(demand.published_at)} />
            ) : null}
            {expiresInfo ? (
              <DetailField
                label="Validade"
                value={expiresInfo.label}
                fullWidth
                valueClassName={cn(
                  expiresInfo.isExpired && 'text-red-600',
                  expiresInfo.isUrgent && !expiresInfo.isExpired && 'text-amber-700',
                )}
              />
            ) : null}
          </DetailGrid>
          {demand.observacoes ? (
            <View className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Text className="text-[11px] font-semibold uppercase text-slate-500">Observações do comprador</Text>
              <Text className="mt-1 text-sm text-slate-700">{demand.observacoes}</Text>
            </View>
          ) : null}
          {marketUnitPrice != null && marketUnitPrice > 0 ? (
            <View className="mt-4 rounded-xl border border-brand/20 bg-brand/5 px-3 py-3">
              <Text className="text-sm font-semibold text-slate-900">Referência de mercado</Text>
              <Text className="mt-1 text-sm text-slate-600">
                Preço unitário:{' '}
                <Text className="font-semibold text-slate-900">{formatCurrency(marketUnitPrice)}</Text>
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                Mínimo viável:{' '}
                <Text className="font-semibold text-slate-900">{formatCurrency(minUnitPrice!)} / unidade</Text>
                {' '}(máx. {OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}% abaixo)
              </Text>
              {minTotalPrice != null ? (
                <Text className="mt-2 text-xs text-slate-500">
                  Para {watchedQuantity} {demand.unidade}: mínimo {formatCurrency(minTotalPrice)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </SectionCard>

        {myOffer ? (
          <SectionCard title="Sua proposta" className="border-green-200 bg-green-50">
            <DetailGrid>
              <DetailField label="Valor total" value={formatCurrency(myOffer.valor)} />
              <DetailField
                label="Prazo de entrega"
                value={`${myOffer.prazo_entrega_dias} ${myOffer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}`}
              />
              <DetailField label="Quantidade" value={String(myOffer.quantidade ?? demand.quantidade)} />
              <DetailField label="Status" value={myOffer.status} />
            </DetailGrid>
            {myOffer.mensagem ? (
              <View className="mt-3 rounded-lg border border-green-200 bg-white/70 px-3 py-2">
                <Text className="text-[11px] font-semibold uppercase text-green-800">Mensagem</Text>
                <Text className="mt-1 text-sm text-green-900">{myOffer.mensagem}</Text>
              </View>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Nova proposta">
            <Controller
              control={control}
              name="valor"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Valor total (R$)"
                  value={String(value ?? '')}
                  onChangeText={(v) => onChange(Number(v.replace(',', '.')) || 0)}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  error={errors.valor?.message}
                />
              )}
            />
            {minTotalPrice != null ? (
              <Text className="-mt-2 text-xs text-slate-500">
                Mínimo para {watchedQuantity} {demand.unidade}: {formatCurrency(minTotalPrice)}
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="quantidade"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Quantidade"
                      value={String(value ?? '')}
                      onChangeText={(v) => onChange(Number(v) || 0)}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      error={errors.quantidade?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="prazo_entrega_dias"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Prazo (dias)"
                      value={String(value ?? '')}
                      onChangeText={(v) => onChange(Number(v) || 0)}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      error={errors.prazo_entrega_dias?.message}
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={control}
              name="validade_dias"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Validade (dias)"
                  value={String(value ?? '')}
                  onChangeText={(v) => onChange(Number(v) || 0)}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  error={errors.validade_dias?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="mensagem"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-slate-700">Mensagem</Text>
                  <TextInput
                    className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-base"
                    multiline
                    placeholder="Detalhes da proposta..."
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              )}
            />
          </SectionCard>
        )}

        <SectionCard title="Chat com comprador">
          {user ? (
            <View style={{ height: 420 }}>
              <ChatThread
                demandId={demand.id}
                supplierId={user.id}
                recipientId={demand.buyer_id}
                offerId={myOffer?.id}
              />
            </View>
          ) : (
            <Text className="text-sm text-slate-500">Faça login para conversar com o comprador.</Text>
          )}
        </SectionCard>
      </ScrollView>

      {showOfferForm ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
          <Button
            label={createOffer.isPending ? 'Enviando...' : 'Enviar proposta'}
            onPress={handleSubmit(onSubmit)}
            loading={createOffer.isPending}
          />
        </View>
      ) : null}
    </SafeAreaView>
  )
}
