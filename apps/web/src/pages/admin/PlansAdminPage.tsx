import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CreditCard, Pencil, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { useAdminPlans, useUpdatePlan } from '@/hooks/use-admin'
import type { Plan, PlanInput } from '@/services/admin'
import { translateSupabaseError } from '@/lib/errors'

type FormValues = PlanInput & {
  unlimited_demands: boolean
  unlimited_offers: boolean
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatLimit(value: number | null) {
  return value === null ? 'Ilimitado' : String(value)
}

function planToForm(plan: Plan): FormValues {
  return {
    name: plan.name,
    description: plan.description ?? '',
    price: plan.price,
    trial_days: plan.trial_days,
    max_demands_monthly: plan.max_demands_monthly,
    max_offers_monthly: plan.max_offers_monthly,
    max_catalog_items: plan.max_catalog_items,
    match_priority: plan.match_priority,
    is_active: plan.is_active,
    sort_order: plan.sort_order,
    unlimited_demands: plan.max_demands_monthly === null,
    unlimited_offers: plan.max_offers_monthly === null,
  }
}

function PlanFeatures({ plan }: { plan: Plan }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
      <li>Demandas/mês: {formatLimit(plan.max_demands_monthly)}</li>
      <li>Propostas/mês: {formatLimit(plan.max_offers_monthly)}</li>
      <li>Itens no catálogo: {plan.max_catalog_items}</li>
      <li>Prioridade em matches: {plan.match_priority ? 'Sim' : 'Não'}</li>
      <li>Período de teste: {plan.trial_days > 0 ? `${plan.trial_days} dias` : 'Sem trial'}</li>
    </ul>
  )
}

export function PlansAdminPage() {
  const { data: plans = [], isLoading } = useAdminPlans()
  const updatePlan = useUpdatePlan()
  const [editing, setEditing] = useState<Plan | null>(null)

  const form = useForm<FormValues>({
    defaultValues: planToForm({
      id: '',
      code: '',
      name: '',
      description: null,
      max_demands_monthly: 0,
      max_offers_monthly: 0,
      max_catalog_items: 0,
      match_priority: false,
      price: 0,
      trial_days: 0,
      is_active: true,
      sort_order: 0,
    }),
  })

  function openEdit(plan: Plan) {
    setEditing(plan)
    form.reset(planToForm(plan))
  }

  async function onSubmit(values: FormValues) {
    if (!editing) return

    const input: Partial<PlanInput> = {
      name: values.name,
      description: values.description || null,
      price: values.price,
      trial_days: values.trial_days,
      max_demands_monthly: values.unlimited_demands ? null : values.max_demands_monthly,
      max_offers_monthly: values.unlimited_offers ? null : values.max_offers_monthly,
      max_catalog_items: values.max_catalog_items,
      match_priority: values.match_priority,
      is_active: values.is_active,
      sort_order: values.sort_order,
    }

    try {
      await updatePlan.mutateAsync({ id: editing.id, input })
      toast.success('Plano atualizado')
      setEditing(null)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  const unlimitedDemands = form.watch('unlimited_demands')
  const unlimitedOffers = form.watch('unlimited_offers')

  return (
    <div className="space-y-6">
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar plano — {editing.code}</CardTitle>
            <CardDescription>
              Alterações afetam novos checkouts e a exibição na página de billing dos usuários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...form.register('name', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço mensal (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register('price', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input id="description" {...form.register('description')} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="max_demands_monthly">Demandas/mês</Label>
                  <Input
                    id="max_demands_monthly"
                    type="number"
                    min="0"
                    disabled={unlimitedDemands}
                    {...form.register('max_demands_monthly', { valueAsNumber: true })}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" {...form.register('unlimited_demands')} />
                    Ilimitado
                  </label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_offers_monthly">Propostas/mês</Label>
                  <Input
                    id="max_offers_monthly"
                    type="number"
                    min="0"
                    disabled={unlimitedOffers}
                    {...form.register('max_offers_monthly', { valueAsNumber: true })}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" {...form.register('unlimited_offers')} />
                    Ilimitado
                  </label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_catalog_items">Itens no catálogo</Label>
                  <Input
                    id="max_catalog_items"
                    type="number"
                    min="1"
                    {...form.register('max_catalog_items', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial_days">Dias de trial</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    min="0"
                    {...form.register('trial_days', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Ordem de exibição</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    {...form.register('sort_order', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('match_priority')} />
                  Prioridade em matches
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('is_active')} />
                  Plano ativo (visível para usuários)
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updatePlan.isPending}>
                  Salvar
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && <GridSkeleton count={3} />}

      {!isLoading && plans.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="Nenhum plano cadastrado"
          description="Os planos são criados via seed ou migration do banco."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{plan.code}</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(plan)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">
                  {formatCurrency(plan.price)}/mês
                </Badge>
                {!plan.is_active && (
                  <Badge className="border border-border bg-transparent">Inativo</Badge>
                )}
              </div>
              <PlanFeatures plan={plan} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
