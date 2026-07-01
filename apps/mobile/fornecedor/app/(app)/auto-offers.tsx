import { useEffect, useMemo } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Zap } from 'lucide-react-native'
import {
  autoOfferSettingsSchema,
  AUTO_OFFER_SKIP_REASON_LABELS,
  AUTO_OFFER_STATUS_LABELS,
  calculateAutoOfferTotal,
  getMinUnitPrice,
  OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
  type AutoOfferSettingsInput,
} from '@keve/shared'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useCategories, type Category } from '@/hooks/use-categories'
import {
  useAutoOfferLogs,
  useAutoOfferSettings,
  useSupplierAutoOfferCategories,
  useUpsertAutoOfferSettings,
} from '@/hooks/use-auto-offers'
import type { AutoOfferLog } from '@/services/auto-offers'
import { formatSupabaseError } from '@/lib/errors'
import { cn, formatCurrency } from '@/lib/utils'

const PREVIEW_MARKET_PRICE = 100
const PREVIEW_QUANTITY = 10

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default function AutoOffersScreen() {
  const { data: settings, isLoading } = useAutoOfferSettings()
  const { data: logsData, isLoading: loadingLogs } = useAutoOfferLogs()
  const logs: AutoOfferLog[] = logsData ?? []
  const { data: supplierCategoryIds = [] } = useSupplierAutoOfferCategories()
  const { data: allCategoriesData } = useCategories()
  const allCategories: Category[] = allCategoriesData ?? []
  const upsertSettings = useUpsertAutoOfferSettings()

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AutoOfferSettingsInput>({
    resolver: zodResolver(autoOfferSettingsSchema),
    defaultValues: {
      enabled: false,
      discount_percent: 0,
      min_demand_quantity: 1,
      max_demand_quantity: null,
      delivery_days: 7,
      validity_days: 7,
      default_message: '',
      category_ids: null,
    },
  })

  useEffect(() => {
    if (settings) reset(settings)
  }, [settings, reset])

  const watchedEnabled = watch('enabled')
  const watchedCategoryIds = watch('category_ids')
  const watchedDiscount = watch('discount_percent') ?? 0

  const supplierCategories = useMemo(
    () => allCategories.filter((cat) => supplierCategoryIds.includes(cat.id)),
    [allCategories, supplierCategoryIds],
  )

  const previewTotal = calculateAutoOfferTotal(PREVIEW_MARKET_PRICE, Number(watchedDiscount), PREVIEW_QUANTITY)
  const previewUnit = previewTotal / PREVIEW_QUANTITY
  const previewMinUnit = getMinUnitPrice(PREVIEW_MARKET_PRICE)

  function toggleCategory(categoryId: string) {
    const current = watch('category_ids')
    if (!current || current.length === 0) {
      setValue('category_ids', [categoryId], { shouldDirty: true })
      return
    }
    const next = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]
    setValue('category_ids', next.length > 0 ? next : null, { shouldDirty: true })
  }

  async function onSubmit(values: AutoOfferSettingsInput) {
    try {
      await upsertSettings.mutateAsync({
        ...values,
        max_demand_quantity: values.max_demand_quantity || null,
        default_message: values.default_message?.trim() ? values.default_message : null,
        category_ids: values.category_ids && values.category_ids.length > 0 ? values.category_ids : null,
      })
      Alert.alert('Sucesso', 'Configurações de auto-proposta salvas')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Auto-proposta" />
      <BackButton className="mx-4 mb-2" fallbackHref="/(app)/profile" />

      <ScrollView contentContainerClassName="gap-4 px-4 pb-32">
        <Card className="border-brand/20 bg-brand/5">
          <Text className="text-sm text-slate-700">
            As propostas automáticas respeitam a margem máxima de{' '}
            <Text className="font-semibold">{OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}%</Text> abaixo do preço de
            mercado e contam no limite mensal do seu plano.
          </Text>
        </Card>

        <Card>
          <Text className="mb-3 text-base font-semibold text-slate-900">Status</Text>
          <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <View className="flex-1 pr-4">
              <Text className="font-medium text-slate-900">Ativar auto-proposta</Text>
              <Text className="text-sm text-slate-500">Dispara quando a demanda é compatível.</Text>
            </View>
            <Switch
              value={watchedEnabled}
              onValueChange={(checked) => setValue('enabled', checked, { shouldDirty: true })}
            />
          </View>
        </Card>

        <Card className="gap-4">
          <Text className="text-base font-semibold text-slate-900">Parâmetros</Text>
          <Controller
            control={control}
            name="discount_percent"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={`Desconto sobre mercado (%) — máx. ${OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}%`}
                value={String(value ?? '')}
                onChangeText={(v) => onChange(Number(v.replace(',', '.')) || 0)}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                error={errors.discount_percent?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="min_demand_quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Qtd. mínima"
                    value={String(value ?? '')}
                    onChangeText={(v) => onChange(Number(v) || 0)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="max_demand_quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Qtd. máx. (opc.)"
                    value={value != null ? String(value) : ''}
                    onChangeText={(v) => onChange(v ? Number(v) : null)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="delivery_days"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Prazo entrega (dias)"
                    value={String(value ?? '')}
                    onChangeText={(v) => onChange(Number(v) || 0)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="validity_days"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Validade (dias)"
                    value={String(value ?? '')}
                    onChangeText={(v) => onChange(Number(v) || 0)}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="default_message"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mensagem padrão (opcional)"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
              />
            )}
          />
        </Card>

        <Card>
          <Text className="mb-2 text-base font-semibold text-slate-900">Categorias</Text>
          <Text className="mb-3 text-sm text-slate-500">
            Deixe vazio para todas elegíveis. Selecione para restringir.
          </Text>
          {supplierCategories.length === 0 ? (
            <Text className="text-sm text-slate-500">
              Nenhuma categoria vinculada. Configure no onboarding ou catálogo.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {supplierCategories.map((cat) => {
                const selected =
                  watchedCategoryIds && watchedCategoryIds.length > 0
                    ? watchedCategoryIds.includes(cat.id)
                    : false
                const allSelected = !watchedCategoryIds || watchedCategoryIds.length === 0
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5',
                      selected || allSelected ? 'border-brand bg-brand/10' : 'border-slate-200',
                    )}
                  >
                    <Text className={cn('text-sm font-medium', selected || allSelected ? 'text-brand' : 'text-slate-700')}>
                      {cat.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </Card>

        <Card>
          <View className="mb-2 flex-row items-center gap-2">
            <Zap size={18} color="#2F66F3" />
            <Text className="text-base font-semibold text-slate-900">Prévia de cálculo</Text>
          </View>
          <Text className="text-sm text-slate-600">
            Exemplo: mercado {formatCurrency(PREVIEW_MARKET_PRICE)}, {PREVIEW_QUANTITY} unidades
          </Text>
          <Text className="mt-2 text-sm">
            Unitário: <Text className="font-semibold">{formatCurrency(previewUnit)}</Text>
          </Text>
          <Text className="text-sm">
            Total: <Text className="font-semibold">{formatCurrency(previewTotal)}</Text>
          </Text>
          <Text className="mt-1 text-xs text-slate-500">
            Piso: {formatCurrency(previewMinUnit)} / unidade
          </Text>
        </Card>

        <Card>
          <Text className="mb-3 text-base font-semibold text-slate-900">Histórico recente</Text>
          {loadingLogs ? (
            <Text className="text-sm text-slate-500">Carregando...</Text>
          ) : logs.length === 0 ? (
            <Text className="text-sm text-slate-500">Nenhum registro ainda.</Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} className="mb-3 rounded-xl border border-slate-200 px-3 py-2.5 last:mb-0">
                <Text className="text-sm font-medium text-slate-900">
                  {AUTO_OFFER_SKIP_REASON_LABELS[log.reason] ?? log.reason}
                </Text>
                <Text className="text-xs text-slate-500">{formatDate(log.created_at)}</Text>
                <View
                  className={cn(
                    'mt-2 self-start rounded-full px-2 py-0.5',
                    log.status === 'sent' ? 'bg-brand' : 'bg-slate-100',
                  )}
                >
                  <Text className={cn('text-xs font-semibold', log.status === 'sent' ? 'text-white' : 'text-slate-600')}>
                    {AUTO_OFFER_STATUS_LABELS[log.status] ?? log.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
        <Button
          label={upsertSettings.isPending ? 'Salvando...' : 'Salvar configurações'}
          onPress={handleSubmit(onSubmit)}
          loading={upsertSettings.isPending}
        />
      </View>
    </SafeAreaView>
  )
}
