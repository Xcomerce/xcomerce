import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const FEATURES = [
  {
    icon: Zap,
    title: 'Match automático',
    text: 'Fornecedores elegíveis são notificados com base em categoria, raio geográfico e catálogo.',
  },
  {
    icon: MessageSquare,
    title: 'Chat contextual',
    text: 'Negocie dentro da demanda, com histórico e reveal de contato controlado.',
  },
  {
    icon: ShieldCheck,
    title: 'Fornecedores verificados',
    text: 'Selo de aprovação após onboarding, garantindo confiança nas negociações.',
  },
  {
    icon: Package,
    title: 'Catálogo integrado',
    text: 'Fornecedores cadastram produtos e respondem demandas com propostas estruturadas.',
  },
  {
    icon: Clock,
    title: 'SLAs e reputação',
    text: 'Acompanhe prazos de resposta e construa histórico de performance na plataforma.',
  },
  {
    icon: BarChart3,
    title: 'Visão centralizada',
    text: 'Compare propostas lado a lado, filtre por preço, prazo e condições comerciais.',
  },
] as const

const AUDIENCES = [
  {
    icon: Building2,
    badge: 'Compradores',
    title: 'Pare de caçar fornecedor',
    points: [
      'Publique uma demanda em minutos com categoria e localização',
      'Receba propostas agrupadas na mesma tela',
      'Compare preço, prazo e condições sem planilhas',
      'Feche pedidos com workflow e rastreabilidade',
    ],
    cta: 'Criar conta de comprador',
    href: '/auth/register/buyer',
    linkLabel: 'Saiba mais para compradores',
    linkHref: '/para-compradores',
  },
  {
    icon: Users,
    badge: 'Fornecedores',
    title: 'Oportunidades na sua região',
    points: [
      'Receba demandas compatíveis com seu catálogo',
      'Envie propostas estruturadas em poucos cliques',
      'Construa reputação com entregas e SLAs',
      'Plano Gold com prioridade no match',
    ],
    cta: 'Cadastrar minha empresa',
    href: '/auth/register/supplier',
    linkLabel: 'Saiba mais para fornecedores',
    linkHref: '/para-fornecedores',
  },
] as const

const STATS = [
  { value: 'Minutos', label: 'para publicar uma demanda' },
  { value: '1 tela', label: 'para comparar propostas' },
  { value: '100%', label: 'rastreável do match ao pedido' },
  { value: '14 dias', label: 'de trial nos planos pagos' },
] as const

const FAQ_ITEMS = [
  {
    question: 'O que é busca reversa B2B?',
    answer:
      'Em vez de você procurar fornecedor, você publica o que precisa e fornecedores compatíveis enviam propostas. A XCOMERCE automatiza esse match por categoria e localização.',
  },
  {
    question: 'A plataforma é gratuita?',
    answer:
      'Sim, existe plano Free para começar. Planos Pro e Gold ampliam limites de demandas, propostas e catálogo, com trial de 14 dias nos planos pagos.',
  },
  {
    question: 'Como funciona a verificação de fornecedores?',
    answer:
      'Fornecedores passam por onboarding e aprovação da equipe antes de receber o selo verificado, aumentando a confiança nas negociações.',
  },
  {
    question: 'Posso usar como comprador e fornecedor?',
    answer:
      'Sim. Um mesmo usuário pode ter perfis distintos e alternar entre eles após o cadastro, conforme a necessidade do negócio.',
  },
  {
    question: 'Como são tratados meus dados?',
    answer:
      'Seguimos a LGPD. Dados de contato só são revelados no fluxo de negociação e você controla o consentimento no cadastro e formulários.',
  },
] as const

export function SocialProofBar() {
  return (
    <section aria-label="Destaques da plataforma" className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-2xl font-bold text-brand-dark md:text-3xl">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FeaturesSection() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge className="mb-4 border-transparent bg-secondary text-secondary-foreground">
          <Sparkles size={14} className="mr-1" />
          Funcionalidades
        </Badge>
        <h2 id="features-heading" className="font-display text-2xl font-semibold md:text-3xl">
          Tudo para comprar e vender B2B com eficiência
        </h2>
        <p className="mt-3 text-muted-foreground">
          Da publicação da demanda ao pedido fechado — match, chat, propostas e reputação em uma única plataforma.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="border-border/80">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon size={20} />
              </div>
              <CardTitle className="font-display text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function AudienceSection() {
  return (
    <section aria-labelledby="audience-heading" className="bg-brand-muted/50 px-4 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl lg:px-2">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="audience-heading" className="font-display text-2xl font-semibold md:text-3xl">
            Feito para os dois lados do B2B
          </h2>
          <p className="mt-3 text-muted-foreground">
            Compradores ganham velocidade na cotação. Fornecedores ganham demandas qualificadas sem prospecção fria.
          </p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <Card key={audience.badge} className="flex flex-col">
              <CardHeader>
                <Badge className="mb-3 w-fit border-border bg-background text-foreground">
                  {audience.badge}
                </Badge>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-dark/10 text-brand-dark">
                  <audience.icon size={20} />
                </div>
                <CardTitle className="font-display text-xl">{audience.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {audience.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button variant="accent" asChild>
                    <Link to={audience.href}>{audience.cta}</Link>
                  </Button>
                  <Link
                    to={audience.linkHref}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {audience.linkLabel}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: Globe,
      title: '1. Publique',
      text: 'Comprador descreve a demanda com categoria, quantidade e localização.',
    },
    {
      icon: Bell,
      title: '2. Match',
      text: 'Fornecedores elegíveis são notificados automaticamente por raio geográfico.',
    },
    {
      icon: ShieldCheck,
      title: '3. Compare e feche',
      text: 'Propostas agrupadas, chat contextual e pedido com integridade e reputação.',
    },
  ] as const

  return (
    <section aria-labelledby="how-it-works-heading" className="mx-auto max-w-7xl px-4 py-16 lg:px-6 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="how-it-works-heading" className="font-display text-2xl font-semibold md:text-3xl">
          Como funciona
        </h2>
        <p className="mt-3 text-muted-foreground">
          Três passos do pedido à proposta — sem ligações, planilhas ou mensagens perdidas no WhatsApp.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
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
  )
}

export function PricingTeaserSection() {
  return (
    <section aria-labelledby="pricing-teaser-heading" className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="overflow-hidden rounded-2xl bg-brand-dark px-6 py-12 text-white md:px-12 md:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10">Planos flexíveis</Badge>
            <h2 id="pricing-teaser-heading" className="font-display text-2xl font-semibold md:text-3xl">
              Comece grátis, evolua quando precisar
            </h2>
            <p className="mt-4 text-white/80">
              Plano Free para validar a plataforma. Pro e Gold ampliam demandas, propostas e catálogo — com 14 dias de
              trial nos planos pagos.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary-foreground" />
                Sem cartão para começar no Free
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary-foreground" />
                Prioridade no match no plano Gold
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary-foreground" />
                Cobrança SaaS via Asaas
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button variant="accent" size="lg" asChild>
              <Link to="/pricing">
                Ver planos e preços
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              asChild
            >
              <Link to="/auth/register/buyer">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 py-16 lg:px-6 lg:py-20">
      <div className="text-center">
        <h2 id="faq-heading" className="font-display text-2xl font-semibold md:text-3xl">
          Perguntas frequentes
        </h2>
        <p className="mt-3 text-muted-foreground">Tire dúvidas sobre a XCOMERCE antes de criar sua conta.</p>
      </div>
      <div className="mt-10 space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-lg border bg-card px-4 py-3 open:shadow-sm [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {item.question}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </section>
  )
}

export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="border-t bg-muted/30 px-4 py-16 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
          <MapPin size={14} />
          Match por categoria e região
        </div>
        <h2 id="cta-heading" className="font-display text-2xl font-semibold md:text-3xl">
          Pronto para encontrar fornecedores em minutos?
        </h2>
        <p className="mt-4 text-muted-foreground">
          Crie sua conta gratuita ou fale com nossa equipe comercial. Sem compromisso.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" asChild>
            <Link to="/auth/register/buyer">
              Sou comprador
              <ArrowRight size={18} />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth/register/supplier">Sou fornecedor</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
