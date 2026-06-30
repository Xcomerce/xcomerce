import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquare,
  Package,
  Send,
  Star,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useDemand } from '@/hooks/use-demands'
import { useOfferDetail, useRevealContact, useAcceptOffer, useRejectOffer, useOffersForDemand } from '@/hooks/use-offers'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { formatSupabaseError } from '@/lib/errors'
import { DemandVariantSummary } from '@/components/buyer/DemandVariantSummary'
import { cn } from '@/lib/utils'
import { ScrollPageShell, SCROLL_PAGE_SECTION_CLASS } from '@/components/layout/ScrollPageShell'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatCNPJ(cnpj: string) {
  if (!cnpj) return ''
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function formatPhone(phone: string | null) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3")
  }
  return phone
}

const QUICK_MESSAGES = [
  'Olá! Consegue melhorar o preço?',
  'Qual o prazo de entrega?',
  'Consegue faturar?',
]


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

type BuyerOfferChatPanelProps = {
  messages: Array<{ id: string; sender_id: string; body: string }>
  messagesLoading: boolean
  userId?: string
  chatBody: string
  onChatBodyChange: (value: string) => void
  onSendChat: (e: React.FormEvent) => void
  sending: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

function BuyerOfferChatPanel({
  messages,
  messagesLoading,
  userId,
  chatBody,
  onChatBodyChange,
  onSendChat,
  sending,
  messagesEndRef,
  className,
}: BuyerOfferChatPanelProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <div
        className={cn(
          'scrollbar-custom min-h-0 flex-1 space-y-2 bg-muted/10 px-4 py-3 lg:px-6',
          messages.length > 0 ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
        )}
      >
        {messagesLoading && (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        )}
        {!messagesLoading && messages.length === 0 && (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda.
          </p>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === userId
          return (
            <div
              key={msg.id}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-card border',
                )}
              >
                {msg.body}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-sidebar-border bg-background p-4 pb-safe-bottom lg:pb-4">
        {!messagesLoading && messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => onChatBodyChange(msg)}
                className="inline-flex items-center rounded-lg border border-border/30 bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary/70 active:scale-95"
              >
                {msg}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSendChat} className="flex gap-2">
          <Input
            placeholder="Negocie prazos, valores..."
            value={chatBody}
            onChange={(e) => onChatBodyChange(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!chatBody.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export function BuyerOfferDetailPage() {
  const { id: offerId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chatBody, setChatBody] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: offer, isLoading: loadingOffer, error: offerError } = useOfferDetail(offerId)
  const { data: demand, isLoading: loadingDemand } = useDemand(offer?.demand_id)
  const { data: allOffers = [] } = useOffersForDemand(offer?.demand_id)

  const activeOffers = allOffers.filter(o => o.status !== 'rejeitada' && o.status !== 'cancelada')
  const isBestPrice = activeOffers.length > 0 && activeOffers[0].id === offer?.id

  let bestPricePercentage: number | null = null
  if (isBestPrice && activeOffers.length > 1 && offer) {
    const nextPrice = activeOffers[1].valor
    if (nextPrice > offer.valor) {
      bestPricePercentage = Math.round(((nextPrice - offer.valor) / nextPrice) * 100)
    }
  }

  const { data: supplierProfile } = useQuery({
    queryKey: ['supplier-profile', offer?.supplier_id],
    queryFn: async () => {
      if (!offer?.supplier_id) return null
      const { data, error } = await supabase
        .from('supplier_profiles')
        .select('*, company:companies(*)')
        .eq('user_id', offer.supplier_id)
        .single()
      
      if (error) return null
      return data
    },
    enabled: !!offer?.supplier_id,
  })

  const revealContact = useRevealContact()
  const acceptOffer = useAcceptOffer()
  const rejectOffer = useRejectOffer()

  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(
    offer?.demand_id,
    offer?.supplier_id
  )
  const sendMessage = useSendMessage()

  useChatSubscription(offer?.demand_id, offer?.supplier_id)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mobileChatOpen])

  useEffect(() => {
    if (!mobileChatOpen) return
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = previousOverflow
    }
  }, [mobileChatOpen])

  async function handleReveal() {
    if (!offer) return
    try {
      await revealContact.mutateAsync(offer.id)
      toast.success('Contato revelado com sucesso')
    } catch (err) {
      toast.error(formatSupabaseError(err))
    }
  }

  async function handleAccept() {
    setShowAcceptModal(true)
  }

  async function confirmAccept() {
    if (!offer) return
    try {
      const order = await acceptOffer.mutateAsync(offer.id)
      toast.success('Proposta aceita! Pedido criado com sucesso.')
      setShowAcceptModal(false)
      navigate(`/buyer/orders/${order.id}`)
    } catch (err) {
      toast.error(formatSupabaseError(err))
    }
  }

  async function handleReject() {
    setShowRejectModal(true)
  }

  async function confirmReject() {
    if (!offer) return
    try {
      await rejectOffer.mutateAsync(offer.id)
      toast.success('Proposta recusada com sucesso.')
      setShowRejectModal(false)
    } catch (err) {
      toast.error(formatSupabaseError(err))
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatBody.trim() || !offer || !user) return

    try {
      await sendMessage.mutateAsync({
        demandId: offer.demand_id,
        supplierId: offer.supplier_id,
        senderId: user.id,
        recipientId: offer.supplier_id,
        body: chatBody.trim(),
        offerId: offer.id,
      })
      setChatBody('')
    } catch (err) {
      toast.error(formatSupabaseError(err))
    }
  }

  if (loadingOffer || loadingDemand) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-10 w-48 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <LoadingSkeleton className="h-96 w-full rounded-2xl" />
          <LoadingSkeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (offerError || !offer || !demand) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Proposta não encontrada ou erro ao carregar.</p>
        <Button className="mt-4 rounded-xl" onClick={() => navigate('/buyer/dashboard')}>
          Voltar ao painel
        </Button>
      </div>
    )
  }

  const imageUrl = getProductImage(demand.titulo)
  const isRejected = offer.status === 'rejeitada' || offer.status === 'cancelada'
  const isAccepted = offer.status === 'aceita'
  const canAccept = !['RASCUNHO', 'CANCELADO', 'EXPIRADO', 'PROPOSTA_ACEITA'].includes(demand.status)
  const showFooter = canAccept && offer.status === 'enviada'

  return (
    <>
      <ScrollPageShell>
        <section
          className={cn(SCROLL_PAGE_SECTION_CLASS, 'space-y-6', showFooter && 'lg:pb-20')}
        >
        {/* Imagem do Produto correspondente à categoria (separada na parte de cima) */}
        <div className="relative h-64 w-full bg-muted overflow-hidden rounded-2xl border border-border/50 shadow-sm shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={demand.titulo}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
              <Package className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Conteúdo fora do card */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                {offer.supplier_name ?? 'Fornecedor Parceiro'}
              </h3>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <p>
                  Localização: <span className="font-semibold text-foreground">{demand.cidade}/{demand.uf}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end text-right gap-0.5 shrink-0">
              <div className="hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground whitespace-nowrap">
                {((supplierProfile as any)?.company?.cnpj) && (
                  <p>
                    CNPJ: <span className="font-semibold text-foreground">{formatCNPJ((supplierProfile as any).company.cnpj)}</span>
                  </p>
                )}
                {offer.contact_revealed ? (
                  <>
                    {offer.supplier_phone && (
                      <p>
                        Tel: <span className="font-semibold text-foreground">{formatPhone(offer.supplier_phone)}</span>
                      </p>
                    )}
                    {offer.supplier_email && (
                      <p>
                        E-mail: <span className="font-semibold text-foreground">{offer.supplier_email}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/85 italic">
                    Contato oculto
                  </p>
                )}
              </div>

              {offer.supplier_avg_rating != null && (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-sm text-foreground">
                    {offer.supplier_avg_rating.toFixed(1)}
                  </span>
                </div>
              )}

              {offer.supplier_avg_rating != null && (
                <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">
                  {offer.supplier_total_ratings ?? 0} {offer.supplier_total_ratings === 1 ? 'avaliação' : 'avaliações'}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Valores e Métricas Financeiras */}
          <div className="!mt-3 pt-2 border-t border-border/30 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
            <div className="shrink-0">
              <div className="flex flex-wrap items-start gap-2">
                <p className="text-3xl font-black text-foreground">{formatCurrency(offer.valor)}</p>
                {isBestPrice && (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Melhor preço{bestPricePercentage ? ` (-${bestPricePercentage}%)` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Valor unitário: <span className="font-semibold text-foreground">{formatCurrency(offer.valor / offer.quantidade)}</span> por {demand.unidade ?? 'un.'}
              </p>
            </div>

            {/* Comparador com outras ofertas */}
            <div className="flex-1 max-w-sm rounded-xl border border-border/20 bg-secondary/35 p-3 text-xs space-y-1">
              <p className="font-bold text-foreground/80">
                Comparativo de propostas
              </p>
              <p className="text-muted-foreground leading-normal text-[11px]">
                {isBestPrice ? (
                  activeOffers.length > 1 ? (
                    <>
                      Esta é a <strong>melhor proposta</strong> recebida. Ela está <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{bestPricePercentage}% mais barata</span> que a segunda melhor oferta.
                    </>
                  ) : (
                    "Esta é a única proposta recebida para esta demanda até o momento."
                  )
                ) : (
                  activeOffers.length > 0 ? (
                    <>
                      Esta proposta está <span className="text-amber-600 dark:text-amber-400 font-semibold">{Math.round(((offer.valor - activeOffers[0].valor) / activeOffers[0].valor) * 100)}% acima</span> da melhor proposta recebida ({formatCurrency(activeOffers[0].valor)}).
                    </>
                  ) : (
                    "Nenhuma outra proposta ativa no momento."
                  )
                )}
              </p>
            </div>
          </div>

          {/* Outras informações e especificações */}
          <div className="!mt-4">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="bg-background/40 border border-border rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Quantidade</span>
                <p className="text-base font-bold text-foreground">{offer.quantidade} {demand.unidade ?? 'un.'}</p>
              </div>
              <div className="bg-background/40 border border-border rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Prazo Entrega</span>
                <p className="text-base font-bold text-foreground">{offer.prazo_entrega_dias} {offer.prazo_entrega_dias === 1 ? 'dia' : 'dias'}</p>
              </div>
              <div className="bg-background/40 border border-border rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Validade da Proposta</span>
                <p className="text-base font-bold text-foreground">
                  {offer.validade_ate 
                    ? new Date(offer.validade_ate).toLocaleDateString('pt-BR') 
                    : `${offer.validade_dias} dias`}
                </p>
              </div>
              <div className="bg-background/40 border border-border rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Condição de Pagamento</span>
                <p className="text-base font-bold text-foreground">A combinar</p>
              </div>
            </div>
          </div>

          {/* Card 3: Comparativo com a Demanda original */}
          <div className="pt-6 border-t border-border/30 space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground/80">
              Comparativo com a demanda
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground font-bold">
                    <th className="pb-2">Critério</th>
                    <th className="pb-2">Sua Necessidade</th>
                    <th className="pb-2">Proposto pelo Fornecedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  <tr>
                    <td className="py-2.5 font-medium text-muted-foreground">Quantidade</td>
                    <td className="py-2.5 text-foreground">{demand.quantidade} {demand.unidade ?? 'un.'}</td>
                    <td className="py-2.5 font-semibold text-foreground">{offer.quantidade} {demand.unidade ?? 'un.'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-muted-foreground">Prazo Limite</td>
                    <td className="py-2.5 text-foreground">
                      {demand.prazo_desejado 
                        ? new Date(demand.prazo_desejado).toLocaleDateString('pt-BR') 
                        : 'Não informado'}
                    </td>
                    <td className="py-2.5 font-semibold text-foreground">
                      Entrega em {offer.prazo_entrega_dias} {offer.prazo_entrega_dias === 1 ? 'dia útil' : 'dias úteis'}
                    </td>
                  </tr>
                  {demand.descricao && (
                    <tr>
                      <td className="py-2.5 font-medium text-muted-foreground">Especificação</td>
                      <td className="py-2.5 text-foreground max-w-xs truncate" title={demand.descricao}>
                        {demand.descricao}
                      </td>
                      <td className="py-2.5 text-muted-foreground italic">
                        Refere-se a esta especificação
                      </td>
                    </tr>
                  )}
                  {(demand.cor || demand.tamanho) && (
                    <tr>
                      <td className="py-2.5 font-medium text-muted-foreground">Variações</td>
                      <td className="py-2.5 text-foreground" colSpan={2}>
                        <DemandVariantSummary demand={demand} inline />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mensagem customizada */}
          {offer.mensagem && (
            <div className="pt-6 border-t border-border/30 space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground/80">
                Observações do fornecedor
              </h4>
              <p className="rounded-xl bg-background/50 px-4 py-3 text-sm text-foreground/80 leading-relaxed italic border border-border/20">
                "{offer.mensagem}"
              </p>
            </div>
          )}

          {/* Detalhes de Contato */}
          <div className="pt-6 border-t border-border/30 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground/80">
              Informações de contato
            </h4>
            
            {/* CNPJ visible only on mobile (below lg) in this section */}
            {((supplierProfile as any)?.company?.cnpj) && (
              <p className="text-xs text-muted-foreground lg:hidden">
                CNPJ: <span className="font-semibold text-foreground">{formatCNPJ((supplierProfile as any).company.cnpj)}</span>
              </p>
            )}

            {offer.contact_revealed ? (
              <div className="rounded-xl border border-green-200/80 bg-green-50/50 p-4 text-sm dark:border-green-950/40 dark:bg-green-950/20 space-y-2">
                <p className="font-bold text-green-700 dark:text-green-400 uppercase tracking-wider text-[10px]">
                  Contato Liberado
                </p>
                {offer.supplier_phone && (
                  <p className="text-foreground">Telefone: <span className="font-semibold">{formatPhone(offer.supplier_phone)}</span></p>
                )}
                {offer.supplier_email && (
                  <p className="text-foreground">E-mail: <span className="font-semibold">{offer.supplier_email}</span></p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground italic">
                  Os dados de contato do fornecedor ficam ocultos até serem revelados ou a proposta ser aceita.
                </p>
                {!isRejected && !isAccepted && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReveal}
                    disabled={revealContact.isPending}
                    className="rounded-xl flex items-center justify-center gap-2 h-[38px] text-xs font-bold border-border/60 hover:bg-muted bg-background shadow-sm"
                  >
                    {revealContact.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Revelar Dados de Contato
                  </Button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileChatOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 lg:hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Chat com fornecedor</p>
              <p className="text-xs text-muted-foreground">
                Negocie prazos, valores e condições desta proposta
              </p>
            </div>
            {messages.length > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {messages.length}
              </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* Chat de Negociação (Painel Lateral — desktop) */}
      <aside className="glass-sidebar hidden min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:h-full lg:w-72 lg:border-l xl:w-80">
        <div className="shrink-0 px-4 pt-4 pb-2 lg:px-6">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" />
            Chat com fornecedor
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Negocie prazos, valores e condições desta proposta
          </p>
        </div>

        <BuyerOfferChatPanel
          messages={messages}
          messagesLoading={messagesLoading}
          userId={user?.id}
          chatBody={chatBody}
          onChatBodyChange={setChatBody}
          onSendChat={handleSendChat}
          sending={sendMessage.isPending}
          messagesEndRef={messagesEndRef}
        />
      </aside>
      </ScrollPageShell>

      {mobileChatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl"
              aria-label="Fechar chat"
              onClick={() => setMobileChatOpen(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Chat com fornecedor</p>
              <p className="truncate text-xs text-muted-foreground">
                {offer.supplier_name ?? demand.titulo}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl"
              aria-label="Fechar chat"
              onClick={() => setMobileChatOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <BuyerOfferChatPanel
            messages={messages}
            messagesLoading={messagesLoading}
            userId={user?.id}
            chatBody={chatBody}
            onChatBodyChange={setChatBody}
            onSendChat={handleSendChat}
            sending={sendMessage.isPending}
            messagesEndRef={messagesEndRef}
          />
        </div>
      )}

      {/* Botões de Decisão Fixos no Footer */}
      {showFooter && (
        <footer className="shrink-0 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:fixed lg:bottom-0 lg:left-60 lg:right-0 lg:z-30 lg:px-6 lg:shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <div className="mx-auto flex max-w-7xl flex-row items-center gap-2 sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReject}
              disabled={rejectOffer.isPending || acceptOffer.isPending}
              className="flex h-[42px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-2 text-xs font-bold text-destructive hover:bg-destructive/15 hover:text-destructive dark:border-destructive/30 dark:bg-destructive/15 dark:hover:bg-destructive/20 sm:flex-none sm:w-auto sm:min-w-[150px] sm:gap-2 sm:px-4 sm:text-sm"
            >
              {rejectOffer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Recusar Proposta
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={rejectOffer.isPending || acceptOffer.isPending}
              className="flex h-[42px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:flex-none sm:w-auto sm:min-w-[150px] sm:gap-2 sm:px-4 sm:text-sm"
            >
              {acceptOffer.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Aceitar Proposta
            </Button>
          </div>
        </footer>
      )}
      {/* Modal de Confirmação - Aceitar */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-200 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Aceitar Proposta</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Confirmar aceitação desta proposta? As demais serão encerradas automaticamente.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAcceptModal(false)}
                disabled={acceptOffer.isPending}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmAccept}
                disabled={acceptOffer.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-[38px] min-w-[100px] flex items-center justify-center gap-1.5 shadow-sm"
              >
                {acceptOffer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Recusar */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-200 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <X className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Recusar Proposta</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tem certeza de que deseja recusar esta proposta? Essa ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                disabled={rejectOffer.isPending}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmReject}
                disabled={rejectOffer.isPending}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold text-xs h-[38px] min-w-[100px] flex items-center justify-center gap-1.5 shadow-sm"
              >
                {rejectOffer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
