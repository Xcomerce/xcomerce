import { Link } from 'react-router-dom'
import { ArrowRight, Search, ShieldCheck, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { LeadCaptureForm } from '@/components/landing/LeadCaptureForm'
import { fetchPlans } from '@/services/billing'

export function LandingPage() {
  return (
    <>
      <section className="bg-brand-dark px-4 py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-wider text-white/70">Marketplace B2B</p>
              <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">
                Publique demandas. Receba propostas qualificadas.
              </h1>
              <p className="mt-6 text-base text-white/80 md:text-lg">
                Busca reversa para compradores e fornecedores regionais. Negocie na plataforma, feche fora — com
                reputação e confiança.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="accent" size="lg" asChild>
                  <Link to="/auth/register/buyer">
                    Sou comprador
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" asChild>
                  <Link to="/auth/register/supplier">Sou fornecedor</Link>
                </Button>
              </div>
            </div>
            <div className="text-foreground">
              <LeadCaptureForm source="landing-home" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <h2 className="font-display text-center text-2xl font-semibold md:text-3xl">Como funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: '1. Publique', text: 'Comprador descreve a demanda com categoria e localização.' },
            { icon: Zap, title: '2. Match', text: 'Fornecedores elegíveis são notificados automaticamente.' },
            { icon: ShieldCheck, title: '3. Compare', text: 'Propostas agrupadas, chat e pedido com integridade.' },
          ].map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon size={20} />
                </div>
                <CardTitle className="font-display text-lg">{step.title}</CardTitle>
                <CardDescription>{step.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}

export function ParaCompradoresPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl font-bold">Para compradores</h1>
          <p className="mt-4 text-muted-foreground">
            Centralize cotações, compare propostas na mesma tela e negocie com fornecedores verificados da sua região.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li>• Publique demandas com categoria e raio geográfico</li>
            <li>• Receba propostas agrupadas por demanda</li>
            <li>• Chat contextual e reveal de contato</li>
            <li>• Workflow de pedidos com SLAs e reputação</li>
          </ul>
          <Button variant="accent" className="mt-8" asChild>
            <Link to="/auth/register/buyer">Criar conta grátis</Link>
          </Button>
        </div>
        <LeadCaptureForm defaultProfileType="buyer" source="landing-buyer" />
      </div>
    </div>
  )
}

export function ParaFornecedoresPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl font-bold">Para fornecedores</h1>
          <p className="mt-4 text-muted-foreground">
            Receba oportunidades qualificadas na sua região, envie propostas e construa reputação na plataforma.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li>• Match automático por categoria e localização</li>
            <li>• Catálogo de produtos integrado</li>
            <li>• Selo verificado após aprovação</li>
            <li>• Planos com prioridade no match (Gold)</li>
          </ul>
          <Button variant="accent" className="mt-8" asChild>
            <Link to="/auth/register/supplier">Cadastrar empresa</Link>
          </Button>
        </div>
        <LeadCaptureForm defaultProfileType="supplier" source="landing-supplier" />
      </div>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatLimit(value: number | null, suffix: string) {
  return value === null ? 'Ilimitado' : `${value}${suffix}`
}

export function PricingPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans-public'],
    queryFn: fetchPlans,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Planos</h1>
        <p className="mt-3 text-muted-foreground">Assinatura SaaS via Asaas · Trial de 14 dias nos planos pagos</p>
      </div>
      {isLoading ? (
        <div className="mt-10">
          <GridSkeleton count={3} />
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <Card key={plan.id} className={plan.code === 'gold' ? 'border-accent/40' : undefined}>
              <CardHeader>
                <CardTitle className="font-display">{plan.name}</CardTitle>
                <CardDescription className="text-2xl font-semibold text-foreground">
                  {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Demandas: {formatLimit(plan.max_demands_monthly, '/mês')}</p>
                <p>Propostas: {formatLimit(plan.max_offers_monthly, '/mês')}</p>
                <p>Catálogo: {plan.max_catalog_items} itens</p>
                {plan.match_priority && <p className="text-accent">Prioridade no match</p>}
                <Button variant={plan.code === 'gold' ? 'accent' : 'default'} className="mt-4 w-full" asChild>
                  <Link to="/auth/register/buyer">
                    {plan.price === 0 ? 'Começar grátis' : 'Assinar'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
