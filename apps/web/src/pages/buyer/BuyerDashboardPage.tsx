import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  Gavel,
  Plus,
  Check,
  X,
  Search,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDemands } from '@/hooks/use-demands'
import { useOffersForDemand, useAcceptOffer, useRejectOffer } from '@/hooks/use-offers'
import { useCategories } from '@/hooks/use-categories'
import { toast } from 'sonner'
import { formatSupabaseError } from '@/lib/errors'
import { getSupabaseProjectLabel, isSupabaseConfigured } from '@/lib/supabase'
import type { Demand } from '@/services/demands'
import { cn, formatRelativeDate } from '@/lib/utils'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatShortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function getProductImage(nome: string): string | null {
  const nameLower = nome.toLowerCase()
  if (nameLower.includes('cimento')) return '/products/cimento.png'
  if (nameLower.includes('tijolo')) return '/products/tijolo.png'
  if (nameLower.includes('brita')) return '/products/brita.png'
  if (nameLower.includes('tinta') || nameLower.includes('esmalte')) return '/products/tinta.png'
  if (nameLower.includes('notebook') || nameLower.includes('computador') || nameLower.includes('switch') || nameLower.includes('impressora')) return '/products/notebook.png'
  if (nameLower.includes('arroz') || nameLower.includes('feijão') || nameLower.includes('azeite')) return '/products/arroz.png'
  if (nameLower.includes('água') || nameLower.includes('agua')) return '/products/agua.png'
  if (nameLower.includes('epi') || nameLower.includes('capacete') || nameLower.includes('uniforme')) return '/products/epi.png'
  if (nameLower.includes('caixa') || nameLower.includes('embalagem') || nameLower.includes('filme stretch') || nameLower.includes('saco')) return '/products/caixa.png'
  return null
}

function OfferCardMini({ 
  offer, 
  isLowest, 
  demandTitle, 
  canAccept,
  destination
}: { 
  offer: any
  isLowest: boolean
  demandTitle: string
  canAccept: boolean 
  destination: string
}) {
  const imageUrl = getProductImage(demandTitle)
  const acceptOffer = useAcceptOffer()
  const rejectOffer = useRejectOffer()
  const navigate = useNavigate()
  
  const isAccepting = acceptOffer.isPending
  const isRejecting = rejectOffer.isPending
  
  const handleAcceptClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Confirmar aceitação desta proposta? As demais serão encerradas automaticamente.')) return
    try {
      const order = await acceptOffer.mutateAsync(offer.id)
      toast.success('Proposta aceita! Pedido criado com sucesso.')
      navigate(`/buyer/orders/${order.id}`)
    } catch (err: any) {
      toast.error(formatSupabaseError(err))
    }
  }

  const handleRejectClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Confirmar recusa desta proposta?')) return
    try {
      await rejectOffer.mutateAsync(offer.id)
      toast.success('Proposta recusada com sucesso.')
    } catch (err: any) {
      toast.error(formatSupabaseError(err))
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    navigate(destination)
  }
  
  return (
    <div 
      onClick={handleCardClick}
      className="group/card cursor-pointer bg-card border border-border/50 rounded-xl overflow-hidden hover:border-border/80 transition-all duration-300 flex flex-col min-h-[220px] w-[270px] shrink-0 snap-start md:w-full md:shrink"
    >
      {/* Imagem do Produto correspondente à categoria */}
      <div className="relative h-24 w-full bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={demandTitle}
            className="h-full w-full object-cover group-hover/card:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Package className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Badge superior esquerdo */}
        <div className="absolute top-2 left-2 z-10">
          {isLowest ? (
            <span className="inline-flex items-center rounded-md bg-emerald-500 text-[9px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
              Melhor Preço
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
              Proposta
            </span>
          )}
        </div>
      </div>

      {/* Detalhes da Proposta */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1">
          <h4 className="font-semibold text-xs text-foreground truncate" title={offer.supplier_name || 'Fornecedor'}>
            {offer.supplier_name || 'Fornecedor Parceiro'}
          </h4>
          {/* Formato de Avaliação: ★ 0.0 (0 avaliações) */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <span className="text-amber-500">★</span>
            <span className="text-foreground font-semibold">
              {(offer.supplier_avg_rating ?? 0).toFixed(1)}
            </span>
            <span className="text-muted-foreground/80">
              ({offer.supplier_total_ratings ?? 0} {offer.supplier_total_ratings === 1 ? 'avaliação' : 'avaliações'})
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            Entrega: {offer.prazo_entrega_dias} {offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}
          </p>
        </div>
        
        <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary">
              {formatCurrency(offer.valor)}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Qtd: {offer.quantidade}
            </span>
          </div>

          {/* Botões de Ações ou Status */}
          {offer.status === 'enviada' && canAccept ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={handleRejectClick}
                disabled={isRejecting || isAccepting}
                className="flex-1 flex items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50/30 hover:bg-red-50 text-[10px] font-bold text-red-600 hover:text-red-700 py-1 transition-colors text-center disabled:opacity-50 h-7"
              >
                <X className="h-3 w-3 shrink-0" />
                <span>{isRejecting ? '...' : 'Recusar'}</span>
              </button>
              <button
                onClick={handleAcceptClick}
                disabled={isRejecting || isAccepting}
                className="flex-1 flex items-center justify-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white py-1 transition-colors text-center disabled:opacity-50 h-7"
              >
                <Check className="h-3 w-3 shrink-0" />
                <span>{isAccepting ? '...' : 'Aceitar'}</span>
              </button>
            </div>
          ) : offer.status === 'aceita' ? (
            <div className="text-center bg-emerald-500/10 border border-emerald-500/20 rounded-full py-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Aceita
              </span>
            </div>
          ) : offer.status === 'rejeitada' ? (
            <div className="text-center bg-destructive/10 border border-destructive/20 rounded-full py-1">
              <span className="text-[10px] font-bold text-destructive">
                Recusada
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function OfferPlaceholderCard({ 
  demandTitle, 
  isDraft,
  destination
}: { 
  demandTitle: string
  isDraft: boolean
  destination: string
}) {
  const imageUrl = getProductImage(demandTitle)
  const navigate = useNavigate()
  
  return (
    <div 
      onClick={() => {
        if (isDraft && destination) {
          navigate(destination)
        }
      }}
      className={cn(
        "bg-card/40 border border-dashed border-border/80 rounded-xl overflow-hidden flex flex-col opacity-60 min-h-[220px] w-[270px] shrink-0 snap-start md:w-full md:shrink",
        isDraft && "cursor-pointer"
      )}
    >
      {/* Imagem do Produto (Opaca/Grayscale) */}
      <div className="relative h-24 w-full bg-muted/30 overflow-hidden grayscale">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={demandTitle}
            className="h-full w-full object-cover opacity-20"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted/20">
            <Package className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Badge superior esquerdo */}
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 border border-border text-[9px] font-medium text-muted-foreground px-1.5 py-0.5">
            <span className={cn("h-1.5 w-1.5 rounded-full bg-muted-foreground/40", !isDraft && "bg-amber-400 animate-pulse")} />
            {isDraft ? 'Rascunho' : 'Aguardando'}
          </span>
        </div>
      </div>

      {/* Detalhes vazios */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-0.5">
          <h4 className="font-medium text-xs text-muted-foreground italic">
            {isDraft ? 'Demanda em rascunho' : 'Buscando propostas...'}
          </h4>
          <p className="text-[9px] text-muted-foreground/60 leading-tight">
            {isDraft ? 'Publique para iniciar o leilão' : 'Notificando fornecedores parceiros'}
          </p>
        </div>
        
        <div className="pt-2 border-t border-border/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground/55">
              Sob consulta
            </span>
            <span className="text-[9px] text-muted-foreground/45">
              --
            </span>
          </div>
          {/* Espaço em branco para alinhar com cards reais que possuem botões */}
          <div className="h-7" />
        </div>
      </div>
    </div>
  )
}

function DemandItem({ demand }: { demand: Demand }) {
  const { data: offers, isLoading: loadingOffers } = useOffersForDemand(demand.id)
  const offerList = offers ?? []
  const lowestValue = offerList.length > 0 ? Math.min(...offerList.map((o) => o.valor)) : null

  const destination = demand.status === 'RASCUNHO'
    ? `/buyer/demands/new?id=${demand.id}`
    : `/buyer/demands/${demand.id}`

  const canAccept = !['RASCUNHO', 'CANCELADO', 'EXPIRADO', 'PROPOSTA_ACEITA'].includes(demand.status)

  // Render exactly 4 cards in the grid or a beautiful empty search state
  const renderCards = () => {
    if (loadingOffers) {
      return Array.from({ length: 4 }).map((_, idx) => (
        <LoadingSkeleton key={`skeleton-${idx}`} className="h-[220px] w-[270px] shrink-0 md:w-full md:shrink rounded-xl" />
      ))
    }

    if (offerList.length === 0) {
      return (
        <div className="col-span-4 w-full py-8 text-center border border-dashed border-border rounded-2xl bg-background/50">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">
            {demand.status === 'RASCUNHO' ? 'Rascunho criado' : 'Buscando propostas...'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5 px-4">
            {demand.status === 'RASCUNHO' ? (
              <>
                Publique esta demanda para <br className="sm:hidden" /> começar a receber propostas.
              </>
            ) : (
              <>
                Notificando fornecedores parceiros. <br className="sm:hidden" /> Novas ofertas aparecerão aqui.
              </>
            )}
          </p>
        </div>
      )
    }

    const cards: React.ReactNode[] = []
    
    // Add active offers (up to 4)
    offerList.slice(0, 4).forEach((offer) => {
      const isLowest = offer.valor === lowestValue
      cards.push(
        <OfferCardMini
          key={offer.id}
          offer={offer}
          isLowest={isLowest}
          demandTitle={demand.titulo}
          canAccept={canAccept}
          destination={`/buyer/offers/${offer.id}`}
        />
      )
    })

    // Fill the remaining slots with placeholders up to 4
    const placeholderCount = 4 - cards.length
    for (let i = 0; i < placeholderCount; i++) {
      cards.push(
        <OfferPlaceholderCard
          key={`placeholder-${demand.id}-${i}`}
          demandTitle={demand.titulo}
          isDraft={demand.status === 'RASCUNHO'}
          destination={destination}
        />
      )
    }

    return cards
  }

  const isDraft = demand.status === 'RASCUNHO'

  const headerContent = (
    <>
      <span className="text-muted-foreground font-mono">ID#{formatShortId(demand.id)}</span>
      <span className="text-muted-foreground/40 font-normal">&gt;</span>
      <span className={cn(isDraft && "group-hover:text-primary transition-colors")}>{demand.titulo}</span>
    </>
  )

  return (
    <div className="group flex flex-col gap-3.5 w-full min-w-0">
      {/* ID PEDIDO > Produto (Header) */}
      {isDraft ? (
        <Link
          to={destination}
          className="flex items-center gap-2 flex-wrap text-sm md:text-base font-semibold text-foreground"
        >
          {headerContent}
        </Link>
      ) : (
        <div className="flex items-center gap-2 flex-wrap text-sm md:text-base font-semibold text-foreground">
          {headerContent}
        </div>
      )}

      {/* Grid of 4 Cards (Offers) - Horizontal Scroll on Mobile */}
      <div className="flex overflow-x-auto gap-4 pb-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-4 md:snap-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] min-w-0 w-[calc(100%+2rem)] -mx-4 px-4 scroll-px-4 md:w-full md:mx-0 md:px-0 md:scroll-px-0">
        {renderCards()}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-4 md:px-0">
      <LoadingSkeleton className="h-40 w-full rounded-2xl" />
      <LoadingSkeleton className="h-48 w-full rounded-2xl" />
      <LoadingSkeleton className="h-48 w-full rounded-2xl" />
    </div>
  )
}

export function BuyerDashboardPage() {
  usePageTitle()
  const { data: demands, isLoading, error } = useDemands()
  const { data: categories } = useCategories()
  const navigate = useNavigate()

  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const userCategories = useMemo(() => {
    if (!demands || !categories) return []
    const uniqueCategoryIds = Array.from(
      new Set(demands.map((d) => d.category_id).filter(Boolean))
    )
    return categories.filter((c) => uniqueCategoryIds.includes(c.id))
  }, [demands, categories])

  const filteredDemands = useMemo(() => {
    if (!demands) return []
    let result = [...demands]

    if (selectedCategoryId) {
      result = result.filter((d) => d.category_id === selectedCategoryId)
    }

    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [demands, selectedCategoryId])

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden px-0 py-6 md:px-6">
      <div className="w-full flex-1 min-h-0 flex flex-col gap-6 overflow-hidden">
        {!isSupabaseConfigured && (
          <div className="px-4 md:px-0">
            <Alert className="border-amber-500/50 text-amber-900 dark:text-amber-200">
              Configure o Supabase em <code className="text-xs">apps/web/.env.local</code> (URL e anon key do
              dashboard). O MCP do Cursor usa outro projeto — o app só lê o .env.
            </Alert>
          </div>
        )}

        {error && (
          <div className="px-4 md:px-0">
            <Alert className="border-destructive/50 text-destructive">
              <p>{formatSupabaseError(error)}</p>
              <p className="mt-2 text-xs opacity-80">
                Projeto no .env: <span className="font-mono">{getSupabaseProjectLabel()}</span>
              </p>
            </Alert>
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : demands && demands.length === 0 ? (
          <div className="px-4 md:px-0">
            <EmptyState
              icon={Gavel}
              title="Nenhuma solicitação criada"
              description="Você ainda não solicitou nenhuma proposta. Comece criando uma nova demanda."
              actionLabel="Solicitar oferta"
              onAction={() => navigate('/buyer/demands/new')}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-hidden">
            {/* Filtros e Ação */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full shrink-0">
              {/* Category Chips */}
              <div className="flex overflow-x-auto gap-2 pb-2 px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] md:px-0 md:flex-wrap md:overflow-x-visible md:pb-0">
                <Button
                  size="sm"
                  variant={selectedCategoryId === '' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategoryId('')}
                  className="rounded-full px-4 text-sm font-semibold shrink-0"
                >
                  Todas
                </Button>
                {userCategories.map((category) => (
                  <Button
                    key={category.id}
                    size="sm"
                    variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className="rounded-full px-4 text-sm font-semibold shrink-0"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Ação */}
              <div className="hidden md:flex flex-wrap items-center gap-3 shrink-0">
                <Button
                  onClick={() => navigate('/buyer/demands/new')}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-brand-primary-dark shadow-sm flex items-center justify-center gap-2 h-[38px] px-4 font-semibold text-sm shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Nova Oferta
                </Button>
              </div>
            </div>

            {/* Lista ou Estado Vazio Filtrado */}
            {filteredDemands.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-transparent">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Package size={24} />
                </div>
                <h3 className="font-display text-lg font-semibold">Nenhuma solicitação encontrada</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Nenhum resultado corresponde aos filtros selecionados. Tente redefinir seus filtros ou limpe-os abaixo.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategoryId('')
                  }}
                  className="mt-4 rounded-xl text-xs font-semibold"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom space-y-10 px-4 md:px-0 md:pr-1 pb-24 md:pb-6">
                {filteredDemands.map((demand) => (
                  <DemandItem key={demand.id} demand={demand} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
