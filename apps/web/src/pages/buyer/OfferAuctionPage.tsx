import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
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
import { useOffersForDemand, useRevealContact, useAcceptOffer } from '@/hooks/use-offers'
import { useAuth } from '@/contexts/auth-context'
import { translateSupabaseError } from '@/lib/errors'
import type { PublicOffer } from '@/services/offers'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatShortId(id: string) {
  return id.slice(0, 8).toUpperCase()
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
}: OfferCardProps) {
  const isRevealing = revealingId === offer.id
  const isAccepting = acceptingId === offer.id
  const isRejecting = rejectingId === offer.id
  const chatOpen = expandedChatId === offer.supplier_id
  const isRejected = offer.status === 'rejeitada' || offer.status === 'cancelada'
  const isAccepted = offer.status === 'aceita'

  return (
    <Card
      className={[
        'relative overflow-hidden border transition-all duration-300',
        isAccepted
          ? 'border-green-400/60 bg-green-50/30 shadow-lg shadow-green-500/10 dark:bg-green-950/10'
          : isRejected
          ? 'border-border/40 bg-muted/20 opacity-60'
          : isLowest
          ? 'border-primary/40 shadow-md shadow-primary/10'
          : 'border-border bg-card shadow-sm hover:shadow-md',
      ].join(' ')}
    >
      {/* Rank badge */}
      <div
        className={[
          'absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-br-xl text-xs font-bold',
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

      {/* Best price badge */}
      {isLowest && !isRejected && !isAccepted && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          <TrendingDown className="h-3 w-3" />
          Menor preço
        </div>
      )}

      <CardContent className="p-5 pt-6 space-y-4">
        {/* Supplier info row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 pl-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                {offer.supplier_name ?? 'Fornecedor'}
              </h3>
              <StatusBadge status={offer.status} kind="offer" />
            </div>
            {offer.supplier_avg_rating != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">
                  {offer.supplier_avg_rating.toFixed(1)}
                </span>
                {offer.supplier_total_ratings != null && (
                  <span>({offer.supplier_total_ratings} avaliações)</span>
                )}
              </div>
            )}
          </div>

          {/* Price block */}
          <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
            <p
              className={[
                'text-2xl font-bold tabular-nums',
                isLowest && !isRejected && !isAccepted
                  ? 'text-primary'
                  : 'text-foreground',
              ].join(' ')}
            >
              {formatCurrency(offer.valor)}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {offer.prazo_entrega_dias} dias
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {offer.quantidade} un.
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/60" />

        {/* Message */}
        {offer.mensagem && (
          <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm text-foreground/80 leading-relaxed">
            {offer.mensagem}
          </p>
        )}

        {/* Contact block */}
        {offer.contact_revealed ? (
          <div className="rounded-xl border border-green-200/80 bg-green-50 px-3.5 py-2.5 dark:border-green-900 dark:bg-green-950/30">
            <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              Contato revelado
            </p>
            {offer.supplier_phone && (
              <p className="text-sm text-foreground">{offer.supplier_phone}</p>
            )}
            {offer.supplier_email && (
              <p className="text-sm text-foreground">{offer.supplier_email}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Contato oculto — revele para negociar diretamente com o fornecedor.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!offer.contact_revealed && !isRejected && !isAccepted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRevealing}
              onClick={() => onReveal(offer.id)}
              className="rounded-xl"
            >
              {isRevealing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              Revelar contato
            </Button>
          )}

          <Button
            type="button"
            variant={chatOpen ? 'default' : 'outline'}
            size="sm"
            className="rounded-xl"
            onClick={() => setExpandedChatId(chatOpen ? null : offer.supplier_id)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {chatOpen ? 'Fechar chat' : 'Chat'}
          </Button>

          {canAccept && offer.status === 'enviada' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRejecting}
                onClick={() => onReject(offer.id)}
                className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto"
              >
                {isRejecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Recusar
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isAccepting}
                onClick={() => onAccept(offer.id)}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {isAccepting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Aceitar
              </Button>
            </>
          )}
        </div>

        {/* Chat thread */}
        {chatOpen && user && (
          <div className="pt-2">
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

  const [expandedChatId, setExpandedChatId] = useState<string | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const rejectingId: string | null = null

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
    // No-op for now — future: call reject endpoint
    toast.info('Funcionalidade de recusa em desenvolvimento.')
    void offerId
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
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl"
          onClick={() => navigate(`/buyer/demands/${demand.id}`)}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            Pedido #{formatShortId(demand.id)}
          </p>
          <h2 className="font-display text-2xl font-semibold leading-tight">{demand.titulo}</h2>
        </div>
      </div>

      {/* ── Demand summary card ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-indigo-500" />

        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          {/* Left: title + status */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono tracking-widest">
                <Gavel className="h-3.5 w-3.5" />
                #{formatShortId(demand.id)}
              </span>
              <StatusBadge status={demand.status} kind="demand" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{demand.descricao}</p>
          </div>

          {/* Right: key metrics */}
          <div className="flex flex-wrap gap-4 text-sm shrink-0">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{demand.quantidade} {demand.unidade}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground/80">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{demand.cidade}/{demand.uf}</span>
            </div>
          </div>
        </div>

        {/* Offers summary footer */}
        {offerList.length > 0 && (
          <div className="border-t border-border/60 px-5 py-3 bg-muted/30 flex flex-wrap items-center gap-6 text-sm">
            <span>
              <span className="font-semibold text-foreground">{offerList.length}</span>
              <span className="text-muted-foreground ml-1">proposta{offerList.length !== 1 ? 's' : ''} recebida{offerList.length !== 1 ? 's' : ''}</span>
            </span>
            {lowestValue !== null && (
              <span>
                <span className="text-muted-foreground">Menor valor: </span>
                <span className="font-semibold text-primary">{formatCurrency(lowestValue)}</span>
              </span>
            )}
          </div>
        )}
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
          <div className="space-y-4">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
