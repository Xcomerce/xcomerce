import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { LeadCaptureForm } from '@/components/landing/LeadCaptureForm'
import {
  AudienceSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  HowItWorksSection,
  PricingTeaserSection,
  SocialProofBar,
} from '@/components/landing/LandingSections'
import { fetchPlans } from '@/services/billing'

export function LandingPage() {
  return (
    <>
      <section className="bg-brand-dark px-4 py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <img src="/logo-icon-light.svg" className="h-8 w-auto object-contain md:h-10" alt="XCOMERCE" />
                <span className="font-display text-xl font-medium tracking-wider text-white md:text-2xl">
                  XCOMERCE
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold uppercase leading-tight md:text-5xl lg:text-6xl">
                Encontre fornecedores
                <br />
                para seus pedidos
                <br />
                em minutos
              </h1>
              <p className="mt-6 text-base text-white/80 md:text-lg">
                Cansado de ir até fornecedores ou mandar mensagens para saber se tem produto disponível? Publique sua
                demanda e a XCOMERCE encontra fornecedores verificados prontos para atender você — por categoria e
                região.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="accent" size="lg" asChild>
                  <Link to="/auth/register/buyer">
                    Sou comprador
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                  asChild
                >
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

      <SocialProofBar />
      <HowItWorksSection />
      <FeaturesSection />
      <AudienceSection />
      <PricingTeaserSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}

export function ParaCompradoresPage() {
  return (
    <>
      <section className="border-b bg-brand-muted/30 px-4 py-14 lg:py-16">
        <div className="mx-auto max-w-5xl lg:px-6">
          <p className="text-sm font-medium text-primary">Para compradores</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Centralize cotações e compare fornecedores na mesma tela
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Publique demandas com categoria e raio geográfico, receba propostas agrupadas e negocie com fornecedores
            verificados — sem planilhas ou mensagens perdidas.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-semibold">O que você ganha</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Publique demandas com categoria, quantidade e localização em minutos
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Receba propostas agrupadas por demanda, prontas para comparar
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Chat contextual com reveal de contato controlado
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Workflow de pedidos com SLAs, reputação e histórico
              </li>
            </ul>
            <Button variant="accent" className="mt-8" asChild>
              <Link to="/auth/register/buyer">Criar conta grátis</Link>
            </Button>
          </div>
          <LeadCaptureForm defaultProfileType="buyer" source="landing-buyer" />
        </div>
      </div>
      <CtaSection />
    </>
  )
}

export function ParaFornecedoresPage() {
  return (
    <>
      <section className="border-b bg-brand-muted/30 px-4 py-14 lg:py-16">
        <div className="mx-auto max-w-5xl lg:px-6">
          <p className="text-sm font-medium text-primary">Para fornecedores</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Receba oportunidades qualificadas na sua região
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Match automático por categoria e localização, catálogo integrado e selo verificado após aprovação. Venda
            B2B com demandas reais, não prospecção fria.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-semibold">Por que vender na XCOMERCE</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Match automático por categoria, raio geográfico e catálogo
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Catálogo de produtos integrado às propostas
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Selo verificado após onboarding e aprovação
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">•</span>
                Planos com prioridade no match (Gold) e trial de 14 dias
              </li>
            </ul>
            <Button variant="accent" className="mt-8" asChild>
              <Link to="/auth/register/supplier">Cadastrar empresa</Link>
            </Button>
          </div>
          <LeadCaptureForm defaultProfileType="supplier" source="landing-supplier" />
        </div>
      </div>
      <CtaSection />
    </>
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
    <>
      <section className="border-b bg-brand-muted/30 px-4 py-14 lg:py-16">
        <div className="mx-auto max-w-7xl text-center lg:px-6">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Planos e preços</h1>
          <p className="mt-3 text-muted-foreground">
            Assinatura SaaS via Asaas · Trial de 14 dias nos planos pagos · Comece grátis no plano Free
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        {isLoading ? (
          <GridSkeleton count={3} />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {(plans ?? []).map((plan) => (
              <Card key={plan.id} className={plan.code === 'gold' ? 'border-accent/40 shadow-md' : undefined}>
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
                  {plan.match_priority && <p className="font-medium text-accent">Prioridade no match</p>}
                  <Button variant={plan.code === 'gold' ? 'accent' : 'default'} className="mt-4 w-full" asChild>
                    <Link to="/auth/register/buyer">{plan.price === 0 ? 'Começar grátis' : 'Assinar'}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Dúvidas sobre qual plano escolher?{' '}
          <Link to="/" className="font-medium text-primary hover:underline">
            Fale conosco na página inicial
          </Link>
          .
        </p>
      </div>
      <FaqSection />
    </>
  )
}
