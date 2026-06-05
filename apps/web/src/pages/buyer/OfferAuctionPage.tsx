import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  Clock,
  Eye,
  Gavel,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Star,
  TrendingDown,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChatThread } from '@/pages/components/chat/ChatThread'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDemand } from '@/hooks/use-demands'
import { useOffersForDemand, useRevealContact, useAcceptOffer, useRejectOffer } from '@/hooks/use-offers'
import { useAuth } from '@/contexts/auth-context'
import { translateSupabaseError } from '@/lib/errors'
import type { PublicOffer } from '@/services/offers'

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

type OfferCardProps = {
  offer: PublicOffer
  rank: number
  canAccept: boolean
  isLowest: boolean
  onReveal: (id: string) => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  revealingId: string | null
  acceptingId: string | null
  rejectingId: string | null
  expandedChatId: string | null
  setExpandedChatId: (id: string | null) => void
  demandId: string
  user: { id: string } | null
  demandTitle: string
}

function OfferCard({
  offer,
  rank,
  canAccept,
  isLowest,
  onReveal,
  onAccept,
  onReject,
  revealingId,
  acceptingId,
  rejectingId,
  expandedChatId,
  setExpandedChatId,
  demandId,
  user,
  demandTitle,
}: OfferCardProps) {
  const imageUrl = getProductImage(demandTitle)
  const navigate = useNavigate()
  const isRevealing = revealingId === offer.id
  const isAccepting = acceptingId === offer.id
  const isRejecting = rejectingId === offer.id
  const chatOpen = expandedChatId === offer.supplier_id
  const isRejected = offer.status === 'rejeitada' || offer.status === 'cancelada'
  const isAccepted = offer.status === 'aceita'

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return
    }
    navigate(`/buyer/offers/${offer.id}`)
  }

  return (
    <Card
      onClick={handleCardClick}
      className={[
        'relative overflow-hidden border transition-all duration-300 flex flex-col min-h-[340px] w-[270px] shrink-0 snap-start md:w-full md:shrink cursor-pointer',
        isAccepted
          ? 'border-green-400/60 bg-green-50/30 shadow-lg shadow-green-500/10 dark:bg-green-950/10'
          : isRejected
          ? 'border-border/40 bg-muted/20 opacity-60'
          : isLowest
          ? 'border-primary/40 shadow-md shadow-primary/10'
          : 'border-border bg-card shadow-sm hover:shadow-md',
      ].join(' ')}
    >
      {/* Imagem do Produto correspondente à categoria */}
      <div className="relative h-32 w-full bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={demandTitle}
            className="h-full w-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <Package className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Badge superior esquerdo */}
        <div className="absolute top-2 left-2 z-10">
          {isLowest && !isRejected ? (
            <span className="inline-flex items-center rounded-md bg-emerald-500 text-[9px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
              Melhor Preço
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.5 uppercase tracking-wider shadow-sm">
              Proposta
            </span>
          )}
        </div>

        {/* Rank badge no canto superior direito */}
        <div
          className={[
            'absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm',
            rank === 1
              ? 'bg-amber-400 text-amber-900'
              : rank === 2
              ? 'bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100'
              : rank === 3
              ? 'bg-orange-300 text-orange-900 dark:bg-orange-700 dark:text-orange-100'
              : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {rank}
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          {/* Supplier Name + StatusBadge */}
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-semibold text-sm text-foreground truncate max-w-[150px]" title={offer.supplier_name ?? 'Fornecedor'}>
              {offer.supplier_name ?? 'Fornecedor Parceiro'}
            </h4>
            {offer.status !== 'enviada' && (
              <StatusBadge status={offer.status} kind="offer" />
            )}
          </div>
          
          {/* Rating: ★ 0.0 (0 avaliações) */}
          {offer.supplier_avg_rating != null && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <span className="text-amber-500">★</span>
              <span className="text-foreground font-semibold">
                {offer.supplier_avg_rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground/80">
                ({offer.supplier_total_ratings ?? 0} {offer.supplier_total_ratings === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          )}
          
          {/* Delivery info */}
          <p className="text-[10px] text-muted-foreground font-medium">
            Entrega: {offer.prazo_entrega_dias} {offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}
          </p>
          
          {/* Message balloon */}
          {offer.mensagem && (
            <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground leading-relaxed italic">
              "{offer.mensagem}"
            </p>
          )}

          {/* Contact information */}
          {offer.contact_revealed ? (
            <div className="rounded-lg border border-green-200/80 bg-green-50/50 p-2 text-[10px] dark:border-green-900/40 dark:bg-green-950/20">
              <p className="font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider text-[9px] mb-0.5">
                Contato revelado
              </p>
              {offer.supplier_phone && <p className="text-foreground">{offer.supplier_phone}</p>}
              {offer.supplier_email && <p className="text-foreground truncate">{offer.supplier_email}</p>}
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground italic">
              Contato oculto — revele ou aceite para negociar diretamente.
            </p>
          )}
        </div>

        {/* Price & Quantity & Actions */}
        <div className="pt-2 border-t border-border/40 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">
              {formatCurrency(offer.valor)}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Qtd: {offer.quantidade} un.
            </span>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Reveal contact button if not revealed and can reveal */}
            {!offer.contact_revealed && !isRejected && !isAccepted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRevealing}
                onClick={() => onReveal(offer.id)}
                className="rounded-full h-8 w-8 p-0 flex items-center justify-center shrink-0 border-border/60 hover:bg-muted"
                title="Revelar contato"
              >
                {isRevealing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-foreground/70" />
                )}
              </Button>
            )}

            {/* Chat button */}
            <Button
              type="button"
              variant={chatOpen ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-8 w-8 p-0 flex items-center justify-center shrink-0 border-border/60 hover:bg-muted"
              onClick={() => setExpandedChatId(chatOpen ? null : offer.supplier_id)}
              title={chatOpen ? 'Fechar chat' : 'Abrir chat'}
            >
              <MessageSquare className="h-3.5 w-3.5 text-foreground/70" />
            </Button>

            {/* Accept / Reject buttons if actionable */}
            {canAccept && offer.status === 'enviada' ? (
              <div className="flex-1 flex items-center gap-1.5">
                <button
                  onClick={() => onReject(offer.id)}
                  disabled={isRejecting || isAccepting}
                  className="flex-1 flex items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50/30 hover:bg-red-50 text-[10px] font-bold text-red-600 hover:text-red-700 py-1 transition-colors text-center disabled:opacity-50 h-8"
                >
                  <X className="h-3 w-3 shrink-0" />
                  <span>{isRejecting ? '...' : 'Recusar'}</span>
                </button>
                <button
                  onClick={() => onAccept(offer.id)}
                  disabled={isRejecting || isAccepting}
                  className="flex-1 flex items-center justify-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white py-1 transition-colors text-center disabled:opacity-50 h-8"
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span>{isAccepting ? '...' : 'Aceitar'}</span>
                </button>
              </div>
            ) : (
              /* Status display when not actionable */
              <div className="flex-1">
                {isAccepted || offer.status === 'aceita' ? (
                  <div className="text-center bg-emerald-500/10 border border-emerald-500/20 rounded-full py-1 h-8 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Aceita
                    </span>
                  </div>
                ) : isRejected || offer.status === 'rejeitada' ? (
                  <div className="text-center bg-destructive/10 border border-destructive/20 rounded-full py-1 h-8 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-destructive">
                      Recusada
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Chat thread */}
        {chatOpen && user && (
          <div className="pt-2 border-t border-border/40 w-full col-span-full">
            <ChatThread
              demandId={demandId}
              supplierId={offer.supplier_id}
              recipientId={offer.supplier_id}
              offerId={offer.id}
              contactRevealed={offer.contact_revealed}
              supplierName={offer.supplier_name}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function OfferAuctionPage() {
  usePageTitle()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: demand, isLoading: loadingDemand, error: demandError } = useDemand(id)
  const { data: offers, isLoading: loadingOffers, error: offersError } = useOffersForDemand(id)

  const revealContact = useRevealContact()
  const acceptOffer = useAcceptOffer()
  const rejectOffer = useRejectOffer()

  const [expandedChatId, setExpandedChatId] = useState<string | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  async function handleReveal(offerId: string) {
    setRevealingId(offerId)
    try {
      await revealContact.mutateAsync(offerId)
      toast.success('Contato revelado com sucesso')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao revelar contato'))
    } finally {
      setRevealingId(null)
    }
  }

  async function handleAccept(offerId: string) {
    if (!window.confirm('Confirmar aceitação desta proposta? As demais serão encerradas automaticamente.')) return
    setAcceptingId(offerId)
    try {
      const order = await acceptOffer.mutateAsync(offerId)
      toast.success('Proposta aceita! Pedido criado com sucesso.')
      navigate(`/buyer/orders/${order.id}`)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao aceitar proposta'))
    } finally {
      setAcceptingId(null)
    }
  }

  async function handleReject(offerId: string) {
    if (!window.confirm('Confirmar recusa desta proposta?')) return
    setRejectingId(offerId)
    try {
      await rejectOffer.mutateAsync(offerId)
      toast.success('Proposta recusada com sucesso.')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao recusar proposta'))
    } finally {
      setRejectingId(null)
    }
  }

  if (loadingDemand) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-24 w-full rounded-2xl" />
        <LoadingSkeleton className="h-48 w-full rounded-2xl" />
        <LoadingSkeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (demandError || !demand) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        Demanda não encontrada ou erro ao carregar.
      </Alert>
    )
  }

  const canAccept = !['RASCUNHO', 'CANCELADO', 'EXPIRADO', 'PROPOSTA_ACEITA'].includes(demand.status)
  const offerList = offers ?? []
  const lowestValue = offerList.length > 0 ? Math.min(...offerList.map((o) => o.valor)) : null

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="relative flex flex-col gap-1.5 md:pr-80">
        {/* ID + right side (badges on desktop + published date) */}
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-mono text-xs font-medium text-muted-foreground tracking-wider bg-muted/10 w-fit">
            ID#{formatShortId(demand.id)}
          </div>
          <div className="hidden md:flex absolute top-0 right-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{demand.quantidade} {demand.unidade}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{demand.cidade}/{demand.uf}</span>
              </div>
            </div>
            <span className="text-xs font-normal text-muted-foreground/60">
              Publicada em: {new Date(demand.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl font-semibold leading-tight">
          {demand.titulo}
        </h2>

        {/* Description */}
        {demand.descricao && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {demand.descricao}
          </p>
        )}

        {/* Quick Info Tags — mobile only */}
        <div className="flex md:hidden flex-wrap items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>{demand.quantidade} {demand.unidade}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{demand.cidade}/{demand.uf}</span>
          </div>
        </div>
      </div>


      {/* ── Offers section ── */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <Gavel className="h-4 w-4 text-primary" />
          Propostas recebidas
        </h3>

        {offersError && (
          <Alert className="mb-4 border-destructive/50 text-destructive">
            Erro ao carregar propostas.
          </Alert>
        )}

        {loadingOffers ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-44 w-full rounded-2xl" />
            <LoadingSkeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : offerList.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhuma proposta ainda"
            description={
              demand.status === 'PUBLICADA'
                ? 'Fornecedores compatíveis serão notificados em breve.'
                : 'Publique a demanda para iniciar o leilão de ofertas.'
            }
          />
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-4 md:snap-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] min-w-0 w-[calc(100%+2rem)] -mx-4 px-4 scroll-px-4 md:w-full md:mx-0 md:px-0 md:scroll-px-0">
            {offerList.map((offer, idx) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                rank={idx + 1}
                canAccept={canAccept}
                isLowest={offer.valor === lowestValue && idx === offerList.findIndex((o) => o.valor === lowestValue)}
                onReveal={handleReveal}
                onAccept={handleAccept}
                onReject={handleReject}
                revealingId={revealingId}
                acceptingId={acceptingId}
                rejectingId={rejectingId}
                expandedChatId={expandedChatId}
                setExpandedChatId={setExpandedChatId}
                demandId={demand.id}
                user={user}
                demandTitle={demand.titulo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
