import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type AuthHeroContent = {
  badge: string
  title: string
  description: string
  features: readonly string[]
}

const REGISTER_HERO: Record<'buyer' | 'supplier', AuthHeroContent> = {
  buyer: {
    badge: 'Área do comprador',
    title: 'Encontre fornecedores para seus pedidos em minutos',
    description:
      'Publique o que precisa, receba propostas de fornecedores compatíveis e escolha a melhor opção em um só lugar.',
    features: [
      'Publique seu pedido de forma simples',
      'Receba propostas de fornecedores compatíveis',
      'Compare preço, prazo e condições antes de escolher',
    ],
  },
  supplier: {
    badge: 'Área do fornecedor',
    title: 'Venda para quem já está procurando seus produtos',
    description:
      'Receba solicitações de compra compatíveis, envie propostas e organize seus pedidos em um só lugar.',
    features: [
      'Veja solicitações compatíveis com o que você vende',
      'Envie propostas de forma rápida e organizada',
      'Acompanhe seus pedidos dentro da plataforma',
    ],
  },
}

function getRegisterHero(pathname: string): AuthHeroContent | null {
  if (pathname.endsWith('/auth/register/buyer')) return REGISTER_HERO.buyer
  if (pathname.endsWith('/auth/register/supplier')) return REGISTER_HERO.supplier
  return null
}

function RegisterHeroContent({ content }: { content: AuthHeroContent }) {
  return (
    <>
      <Badge className="mb-6 border-white/30 bg-white/10 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/10">
        {content.badge}
      </Badge>
      <h2 className="font-display text-3xl font-bold leading-tight">{content.title}</h2>
      <p className="mt-4 text-white/80">{content.description}</p>
      <ul className="mt-8 space-y-4">
        {content.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-white/90">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function AuthHeroPanel() {
  const { pathname } = useLocation()
  const registerHero = getRegisterHero(pathname)

  return (
    <div className="hidden flex-col justify-between bg-brand-dark p-10 text-white lg:flex">
      <Link to="/" className="flex items-center">
        <img src="/logo-clara.svg" className="h-14 object-contain" alt="X COMERCE" />
      </Link>

      <div className="max-w-md">
        {registerHero ? (
          <RegisterHeroContent content={registerHero} />
        ) : (
          <>
            <h2 className="font-display text-3xl font-bold leading-tight">
              Busca reversa B2B para compradores e fornecedores
            </h2>
            <p className="mt-4 text-white/80">
              Publique pedidos, receba propostas qualificadas e negocie com fornecedores verificados na sua região.
            </p>
          </>
        )}
      </div>

      <p className="text-sm text-white/60">© {new Date().getFullYear()} X COMERCE</p>
    </div>
  )
}
