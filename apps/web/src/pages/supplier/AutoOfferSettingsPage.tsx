import { useEffect, useMemo, useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Zap } from 'lucide-react'
import {
  autoOfferSettingsSchema,
  AUTO_OFFER_SKIP_REASON_LABELS,
  AUTO_OFFER_STATUS_LABELS,
  calculateAutoOfferTotal,
  getMinUnitPrice,
  OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
  type AutoOfferSettingsInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Alert } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useCategories } from '@/hooks/use-categories'
import {
  useAutoOfferLogs,
  useAutoOfferSettings,
  useSupplierAutoOfferCategories,
  useUpsertAutoOfferSettings,
} from '@/hooks/use-auto-offers'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const PREVIEW_MARKET_PRICE = 100
const PREVIEW_QUANTITY = 10

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AutoOfferSettingsPage() {
  usePageTitle()
  const { data: settings, isLoading } = useAutoOfferSettings()
  const { data: logs = [], isLoading: loadingLogs } = useAutoOfferLogs()
  const { data: supplierCategoryIds = [] } = useSupplierAutoOfferCategories()
  const { data: allCategories = [] } = useCategories()
  const upsertSettings = useUpsertAutoOfferSettings()

  const form = useForm<AutoOfferSettingsInput>({
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
    if (!settings) return
    form.reset(settings)
  }, [settings, form])

  const watchedEnabled = form.watch('enabled')
  const watchedCategoryIds = form.watch('category_ids')

  const supplierCategories = useMemo(
    () => allCategories.filter((cat) => supplierCategoryIds.includes(cat.id)),
    [allCategories, supplierCategoryIds],
  )

  function toggleCategory(categoryId: string) {
    const current = form.getValues('category_ids')
    if (!current || current.length === 0) {
      form.setValue('category_ids', [categoryId], { shouldDirty: true })
      return
    }
    const next = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]
    form.setValue('category_ids', next.length > 0 ? next : null, { shouldDirty: true })
  }

  async function onSubmit(values: AutoOfferSettingsInput) {
    try {
      await upsertSettings.mutateAsync({
        ...values,
        max_demand_quantity: values.max_demand_quantity || null,
        default_message: values.default_message?.trim() ? values.default_message : null,
        category_ids:
          values.category_ids && values.category_ids.length > 0 ? values.category_ids : null,
      })
      toast.success('Configurações de auto-proposta salvas')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <LoadingSkeleton className="h-64 w-full" />
            <LoadingSkeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col pb-[4.5rem] lg:pb-0">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-4 lg:p-6">
        <div className="space-y-6">
          <Alert>
            <p className="text-sm">
              As propostas automáticas respeitam a margem máxima de{' '}
              <strong>{OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}%</strong> abaixo do preço de mercado e
              contam no limite mensal do seu plano.
            </p>
          </Alert>

          <Form {...form}>
            <form
              id="auto-offer-settings-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-6 lg:grid-cols-2 lg:items-start"
            >
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
                <CardDescription>
                  Ative para responder automaticamente às novas oportunidades de match.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div>
                    <p className="font-medium">Ativar auto-proposta</p>
                    <p className="text-sm text-muted-foreground">
                      Dispara no momento em que a demanda é compatível com seu perfil.
                    </p>
                  </div>
                  <Switch
                    checked={watchedEnabled}
                    onCheckedChange={(checked) =>
                      form.setValue('enabled', checked, { shouldDirty: true })
                    }
                    aria-label="Ativar auto-proposta"
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parâmetros</CardTitle>
                <CardDescription>
                  Defina desconto, volume aceito e prazos padrão da proposta automática.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="discount_percent"
                  render={({ field }) => (
                    <DiscountSliderField field={field} />
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="min_demand_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade mínima da demanda</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_demand_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade máxima (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="delivery_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de entrega (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="validity_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Validade da proposta (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={30} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="default_message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem padrão (opcional)</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Detalhes enviados junto com a proposta automática..."
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorias</CardTitle>
                <CardDescription>
                  Deixe vazio para todas as categorias já elegíveis no match. Selecione para restringir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {supplierCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma categoria vinculada ao seu perfil. Configure no{' '}
                    <Link to="/supplier/onboarding" className="text-primary hover:underline">
                      onboarding
                    </Link>{' '}
                    ou no catálogo.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {supplierCategories.map((cat) => {
                      const selected =
                        !watchedCategoryIds || watchedCategoryIds.length === 0
                          ? false
                          : watchedCategoryIds.includes(cat.id)
                      const allSelected = !watchedCategoryIds || watchedCategoryIds.length === 0
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            selected || allSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary/30 text-foreground hover:bg-secondary/50',
                          )}
                        >
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {watchedCategoryIds && watchedCategoryIds.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {watchedCategoryIds.length} categoria(s) selecionada(s)
                  </p>
                )}
              </CardContent>
            </Card>

            <CalculationPreviewCard control={form.control} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico recente</CardTitle>
                <CardDescription>Últimas tentativas de auto-proposta.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro ainda. Ative a auto-proposta para começar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col gap-1 rounded-xl border border-border/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {AUTO_OFFER_SKIP_REASON_LABELS[log.reason] ?? log.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                        </div>
                        <Badge
                          className={cn(
                            'self-start sm:self-center',
                            log.status === 'sent'
                              ? 'border-0 bg-primary text-primary-foreground'
                              : 'border border-border bg-secondary/30',
                          )}
                        >
                          {AUTO_OFFER_STATUS_LABELS[log.status] ?? log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </form>
          </Form>
        </div>
      </div>

      <footer className="flex shrink-0 justify-end border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:px-6">
        <Button
          type="submit"
          form="auto-offer-settings-form"
          className="rounded-xl font-semibold"
          disabled={upsertSettings.isPending}
        >
          {upsertSettings.isPending ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </footer>
    </div>
  )
}

function formatDiscountPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function DiscountSliderField({
  field,
}: {
  field: {
    value: number
    onChange: (value: number) => void
  }
}) {
  const [liveValue, setLiveValue] = useState(Number(field.value))

  useEffect(() => {
    setLiveValue(Number(field.value))
  }, [field.value])

  return (
    <FormItem>
      <div className="flex items-center justify-between gap-2">
        <FormLabel>Desconto sobre o preço de mercado (%)</FormLabel>
        <span className="text-sm font-semibold tabular-nums text-primary">
          {formatDiscountPercent(liveValue)}%
        </span>
      </div>
      <FormControl>
        <Slider
          min={0}
          max={OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}
          step={0.1}
          value={Number(field.value)}
          onValueChange={setLiveValue}
          onValueCommit={field.onChange}
        />
      </FormControl>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>{OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}%</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Máximo {OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}% — alinhado à regra de leilão.
      </p>
      <FormMessage />
    </FormItem>
  )
}

function CalculationPreviewCard({ control }: { control: Control<AutoOfferSettingsInput> }) {
  const discountPercent = useWatch({ control, name: 'discount_percent' }) ?? 0
  const deferredDiscount = useDeferredValue(Number(discountPercent))
  const previewTotal = calculateAutoOfferTotal(
    PREVIEW_MARKET_PRICE,
    deferredDiscount,
    PREVIEW_QUANTITY,
  )
  const previewUnit = previewTotal / PREVIEW_QUANTITY
  const previewMinUnit = getMinUnitPrice(PREVIEW_MARKET_PRICE)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Prévia de cálculo
        </CardTitle>
        <CardDescription>
          Exemplo com preço de mercado {formatCurrency(PREVIEW_MARKET_PRICE)} e{' '}
          {PREVIEW_QUANTITY} unidades.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Preço unitário proposto:{' '}
          <span className="font-semibold">{formatCurrency(previewUnit)}</span>
        </p>
        <p>
          Valor total da proposta:{' '}
          <span className="font-semibold">{formatCurrency(previewTotal)}</span>
        </p>
        <p className="text-muted-foreground">
          Piso permitido: {formatCurrency(previewMinUnit)} / unidade (80% do mercado)
        </p>
      </CardContent>
    </Card>
  )
}
