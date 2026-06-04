import { useState } from 'react'
import { CreditCard, Loader2, Receipt, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { LoadingSkeleton, CardSkeleton } from '@/components/common/LoadingSkeleton'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { usePageTitle } from '@/hooks/use-page-title'
import { usePlans, useSubscription, useUsage, useCreateCheckout } from '@/hooks/use-billing'
import type { BillingType } from '@/services/billing'
import { translateSupabaseError } from '@/lib/errors'

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: 'Período de teste',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
}

const USAGE_LABELS: Record<string, string> = {
  demands_published: 'Demandas publicadas',
  offers_sent: 'Propostas enviadas',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function BillingPage() {
  usePageTitle()
  const { data: subscription, isLoading: loadingSub, error: subError } = useSubscription()
  const { data: usage, isLoading: loadingUsage, error: usageError } = useUsage()
  const { data: plans, isLoading: loadingPlans, error: plansError } = usePlans()
  const checkout = useCreateCheckout()
  const [billingType, setBillingType] = useState<BillingType>('PIX')

  const currentPlan = subscription?.plan
  const isLoading = loadingSub || loadingUsage || loadingPlans
  const error = subError || usageError || plansError

  async function handleUpgrade(planId: string) {
    try {
      const origin = window.location.origin
      const result = await checkout.mutateAsync({
        plan_id: planId,
        billing_type: billingType,
        success_url: `${origin}/settings/billing?checkout=success`,
        cancel_url: `${origin}/settings/billing?checkout=cancel`,
      })
      window.location.href = result.checkout_url
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao iniciar checkout'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        Não foi possível carregar informações de billing. Tente novamente mais tarde.
      </Alert>
    )
  }

  const upgradePlans = (plans ?? []).filter((p) => p.id !== currentPlan?.id)

  return (
    <div className="space-y-6">

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Plano atual
            </CardTitle>
            <CardDescription>Sua assinatura e benefícios do mês.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlan ? (
              <>
                <div>
                  <p className="text-2xl font-semibold">{currentPlan.name}</p>
                  <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-secondary text-secondary-foreground">
                    {formatCurrency(currentPlan.price)}/mês
                  </Badge>
                  {subscription?.status && (
                    <Badge className="bg-primary text-primary-foreground">
                      {SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status}
                    </Badge>
                  )}
                </div>
                {subscription?.trial_ends_at && subscription.status === 'trialing' && (
                  <p className="text-sm text-muted-foreground">
                    Teste até {new Date(subscription.trial_ends_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma assinatura ativa. Escolha um plano abaixo.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Uso do mês
            </CardTitle>
            <CardDescription>Contadores do período atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(usage ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum uso registrado neste mês.</p>
            ) : (
              (usage ?? []).map((counter) => {
                const label = USAGE_LABELS[counter.counter_type] ?? counter.counter_type
                const limit =
                  counter.counter_type === 'demands_published'
                    ? currentPlan?.max_demands_monthly ?? null
                    : counter.counter_type === 'offers_sent'
                      ? currentPlan?.max_offers_monthly ?? null
                      : null
                return (
                  <QuotaBadge key={counter.id} used={counter.count} limit={limit} label={label} />
                )
              })
            )}
            {currentPlan && (
              <div className="pt-2 text-sm text-muted-foreground">
                Catálogo: até {currentPlan.max_catalog_items} itens
                {currentPlan.match_priority ? ' · Prioridade em matches' : ''}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {upgradePlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Fazer upgrade
            </CardTitle>
            <CardDescription>Escolha a forma de pagamento e selecione um plano.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['PIX', 'BOLETO', 'CREDIT_CARD'] as BillingType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={billingType === type ? 'default' : 'outline'}
                  onClick={() => setBillingType(type)}
                >
                  {type === 'PIX' ? 'PIX' : type === 'BOLETO' ? 'Boleto' : 'Cartão'}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upgradePlans.map((plan) => (
                <Card key={plan.id} className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xl font-semibold">{formatCurrency(plan.price)}/mês</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>
                        Demandas: {plan.max_demands_monthly ?? 'Ilimitadas'}/mês
                      </li>
                      <li>
                        Propostas: {plan.max_offers_monthly ?? 'Ilimitadas'}/mês
                      </li>
                      <li>Catálogo: {plan.max_catalog_items} itens</li>
                    </ul>
                    <Button
                      className="w-full"
                      variant="accent"
                      disabled={checkout.isPending}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {checkout.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redirecionando...
                        </>
                      ) : (
                        'Assinar plano'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
