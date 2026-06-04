import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Eye,
  Gavel,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ChatThread } from '@/pages/components/chat/ChatThread'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDemand, usePublishDemand } from '@/hooks/use-demands'
import { useOffersForDemand, useRevealContact, useAcceptOffer } from '@/hooks/use-offers'
import { useAuth } from '@/contexts/auth-context'
import { translateSupabaseError } from '@/lib/errors'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function DemandDetailPage() {
  usePageTitle()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: demand, isLoading: loadingDemand, error: demandError } = useDemand(id)
  const { data: offers, isLoading: loadingOffers, error: offersError } = useOffersForDemand(id)
  const revealContact = useRevealContact()
  const acceptOffer = useAcceptOffer()
  const publishDemand = usePublishDemand()
  const [expandedChatSupplierId, setExpandedChatSupplierId] = useState<string | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  async function handlePublish() {
    if (!demand) return
    setPublishing(true)
    try {
      await publishDemand.mutateAsync(demand.id)
      toast.success('Solicitação publicada com sucesso!')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao publicar solicitação'))
    } finally {
      setPublishing(false)
    }
  }

  async function handleReveal(offerId: string) {
    setRevealingId(offerId)
    try {
      await revealContact.mutateAsync(offerId)
      toast.success('Contato revelado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao revelar contato'))
    } finally {
      setRevealingId(null)
    }
  }

  async function handleAccept(offerId: string) {
    if (!window.confirm('Aceitar esta proposta? As demais serão encerradas e um pedido será criado.')) {
      return
    }
    setAcceptingId(offerId)
    try {
      const order = await acceptOffer.mutateAsync(offerId)
      toast.success('Proposta aceita! Pedido criado.')
      navigate(`/buyer/orders/${order.id}`)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao aceitar proposta'))
    } finally {
      setAcceptingId(null)
    }
  }

  if (loadingDemand) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-48 w-full" />
        <LoadingSkeleton className="h-64 w-full" />
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

  const canEdit = demand.status === 'RASCUNHO'
  const canAcceptOffers = !['RASCUNHO', 'CANCELADO', 'EXPIRADO', 'PROPOSTA_ACEITA'].includes(demand.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/buyer/dashboard" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold">{demand.titulo}</h2>
              <StatusBadge status={demand.status} kind="demand" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{demand.descricao}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline">
              <Link to={`/buyer/demands/new?id=${demand.id}`}>Editar rascunho</Link>
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publicar solicitação
            </Button>
          </div>
        )}
        {!canEdit && (
          <Button asChild variant="accent" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Link to={`/buyer/demands/${demand.id}/auction`}>
              <Gavel className="h-4 w-4" />
              Ver leilão de ofertas
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Quantidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {demand.quantidade} {demand.unidade}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {demand.cidade}/{demand.uf}
            </p>
            <p className="text-sm text-muted-foreground">Raio: {demand.raio_km} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Publicação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {demand.published_at
                ? new Date(demand.published_at).toLocaleString('pt-BR')
                : 'Ainda não publicada'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h3 className="mb-4 font-display text-xl font-semibold">Propostas recebidas</h3>

        {offersError && (
          <Alert className="mb-4 border-destructive/50 text-destructive">
            Erro ao carregar propostas.
          </Alert>
        )}

        {loadingOffers ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-32 w-full" />
            <LoadingSkeleton className="h-32 w-full" />
          </div>
        ) : (offers ?? []).length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhuma proposta ainda"
            description={
              demand.status === 'PUBLICADA'
                ? 'Fornecedores compatíveis serão notificados em breve.'
                : 'Publique a demanda para receber propostas.'
            }
          />
        ) : (
          <div className="space-y-4">
            {(offers ?? []).map((offer) => {
              const chatOpen = expandedChatSupplierId === offer.supplier_id
              const isRevealing = revealingId === offer.id
              const isAccepting = acceptingId === offer.id

              return (
                <Card key={offer.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {offer.supplier_name ?? 'Fornecedor'}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2">
                          {offer.supplier_avg_rating != null && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {offer.supplier_avg_rating.toFixed(1)}
                              {offer.supplier_total_ratings != null && (
                                <span>({offer.supplier_total_ratings})</span>
                              )}
                            </span>
                          )}
                          <StatusBadge status={offer.status} kind="offer" />
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-primary">
                          {formatCurrency(offer.valor)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prazo: {offer.prazo_entrega_dias} dias · Qtd: {offer.quantidade}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {offer.mensagem && (
                      <p className="rounded-lg bg-muted/50 p-3 text-sm">{offer.mensagem}</p>
                    )}

                    {offer.contact_revealed ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/30">
                        <p className="font-medium text-green-800 dark:text-green-300">Contato revelado</p>
                        {offer.supplier_phone && <p>Telefone: {offer.supplier_phone}</p>}
                        {offer.supplier_email && <p>E-mail: {offer.supplier_email}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Contato do fornecedor oculto até revelar ou aceitar a proposta.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {!offer.contact_revealed && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRevealing}
                          onClick={() => handleReveal(offer.id)}
                        >
                          {isRevealing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          Revelar contato
                        </Button>
                      )}
                      {canAcceptOffers && offer.status === 'enviada' && (
                        <Button
                          type="button"
                          variant="accent"
                          size="sm"
                          disabled={isAccepting}
                          onClick={() => handleAccept(offer.id)}
                        >
                          {isAccepting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Aceitar proposta
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={chatOpen ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setExpandedChatSupplierId(chatOpen ? null : offer.supplier_id)
                        }
                      >
                        <MessageSquare className="h-4 w-4" />
                        {chatOpen ? 'Fechar chat' : 'Abrir chat'}
                      </Button>
                    </div>

                    {chatOpen && user && (
                      <ChatThread
                        demandId={demand.id}
                        supplierId={offer.supplier_id}
                        recipientId={offer.supplier_id}
                        offerId={offer.id}
                        contactRevealed={offer.contact_revealed}
                        supplierName={offer.supplier_name}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
