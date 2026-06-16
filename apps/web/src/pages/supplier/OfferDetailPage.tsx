import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, MessageSquare, Send, X } from 'lucide-react'
import {
  createOfferSchema,
  getMinTotalPrice,
  getMinUnitPrice,
  OFFER_MARKET_DOWNWARD_MARGIN_PERCENT,
  type OfferInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useDemand } from '@/hooks/use-demands'
import { useCategories } from '@/hooks/use-categories'
import { useCreateOffer, useOffersForDemand } from '@/hooks/use-offers'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { translateSupabaseError } from '@/lib/errors'
import { fetchDemandMarketPrice } from '@/services/pricing'
import { cn, formatExpiresAt } from '@/lib/utils'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDemandDate(value: string | null | undefined): string {
  if (!value) return 'Não informado'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type OfferChatPanelProps = {
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

function OfferChatPanel({
  messages,
  messagesLoading,
  userId,
  chatBody,
  onChatBodyChange,
  onSendChat,
  sending,
  messagesEndRef,
  className,
}: OfferChatPanelProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <div
        className={cn(
          'scrollbar-custom min-h-0 flex-1 px-4 py-3 lg:px-6 space-y-2 bg-muted/10',
          messages.length > 0 ? 'overflow-y-auto' : 'overflow-hidden',
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
        <form onSubmit={onSendChat} className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
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

export function OfferDetailPage() {
  const { demandId } = useParams<{ demandId: string }>()
  const { user } = useAuth()
  const [chatBody, setChatBody] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [marketUnitPrice, setMarketUnitPrice] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: demand, isLoading: demandLoading } = useDemand(demandId)
  const { data: categories = [] } = useCategories()
  const { data: offers = [] } = useOffersForDemand(demandId)
  const createOffer = useCreateOffer()
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(demandId, user?.id)
  const sendMessage = useSendMessage()

  useChatSubscription(demandId, user?.id)

  const myOffer = offers.find((o) => o.supplier_id === user?.id)
  const showOfferFooter = !myOffer

  const offerSchemaResolved = useMemo(
    () => createOfferSchema(marketUnitPrice),
    [marketUnitPrice],
  )

  const form = useForm<OfferInput>({
    resolver: zodResolver(offerSchemaResolved),
    defaultValues: {
      demand_id: demandId ?? '',
      valor: 0,
      prazo_entrega_dias: 7,
      validade_dias: 7,
      quantidade: demand?.quantidade ?? 1,
      mensagem: '',
    },
  })

  const watchedQuantity = form.watch('quantidade')
  const minUnitPrice = marketUnitPrice != null && marketUnitPrice > 0 ? getMinUnitPrice(marketUnitPrice) : null
  const minTotalPrice =
    minUnitPrice != null && watchedQuantity > 0
      ? getMinTotalPrice(marketUnitPrice!, watchedQuantity)
      : null

  const categoryName = useMemo(
    () => categories.find((c) => c.id === demand?.category_id)?.name,
    [categories, demand?.category_id],
  )

  const expiresInfo = useMemo(
    () => (demand ? formatExpiresAt(demand.expires_at) : null),
    [demand?.expires_at, demand],
  )

  useEffect(() => {
    if (demandId) form.setValue('demand_id', demandId)
    if (demand) form.setValue('quantidade', demand.quantidade)
  }, [demandId, demand, form])

  useEffect(() => {
    if (!demandId) return

    let cancelled = false

    fetchDemandMarketPrice(demandId)
      .then((price) => {
        if (!cancelled) setMarketUnitPrice(price)
      })
      .catch(() => {
        if (!cancelled) setMarketUnitPrice(null)
      })

    return () => {
      cancelled = true
    }
  }, [demandId, demand?.preco_referencia_mercado, demand?.category_id])

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

  async function onSubmit(values: OfferInput) {
    try {
      await createOffer.mutateAsync(values)
      toast.success('Proposta enviada')
      form.reset({
        ...values,
        mensagem: '',
      })
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar'))
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatBody.trim() || !demandId || !user || !demand) return

    try {
      await sendMessage.mutateAsync({
        demandId,
        supplierId: user.id,
        senderId: user.id,
        recipientId: demand.buyer_id,
        body: chatBody.trim(),
        offerId: myOffer?.id ?? null,
      })
      setChatBody('')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro no chat'))
    }
  }

  if (demandLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4 lg:p-6 space-y-4">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Demanda não encontrada.</p>
        <Button className="mt-4" asChild>
          <Link to="/supplier/board">Voltar ao mural</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 space-y-6">
          <div>
            <h1 className="font-display text-xl font-bold">{demand.titulo}</h1>
            <p className="text-sm text-muted-foreground">
              {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade}
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Demanda</CardTitle>
                <StatusBadge status={demand.status} kind="demand" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{demand.descricao}</p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Categoria
                  </dt>
                  <dd className="text-sm font-medium break-words">{categoryName ?? '—'}</dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Quantidade
                  </dt>
                  <dd className="text-sm font-medium break-words">
                    {demand.quantidade} {demand.unidade}
                  </dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Localização
                  </dt>
                  <dd className="text-sm font-medium break-words">
                    {demand.cidade}/{demand.uf}
                  </dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Raio de entrega
                  </dt>
                  <dd className="text-sm font-medium">{demand.raio_km} km</dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Prazo desejado
                  </dt>
                  <dd className="text-sm font-medium break-words">{formatDemandDate(demand.prazo_desejado)}</dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Publicada em
                  </dt>
                  <dd className="text-sm font-medium break-words">{formatDemandDate(demand.published_at)}</dd>
                </div>
                {expiresInfo && (
                  <div className="min-w-0 space-y-0.5 col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Validade da demanda
                    </dt>
                    <dd
                      className={cn(
                        'text-sm font-medium',
                        expiresInfo.isExpired && 'text-destructive',
                        expiresInfo.isUrgent && !expiresInfo.isExpired && 'text-amber-700 dark:text-amber-400',
                      )}
                    >
                      {expiresInfo.label}
                    </dd>
                  </div>
                )}
              </dl>

              {demand.observacoes && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Observações do comprador
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{demand.observacoes}</p>
                </div>
              )}

              {marketUnitPrice != null && marketUnitPrice > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
                  <p className="text-muted-foreground">
                    Preço de mercado (referência unitária):{' '}
                    <span className="font-semibold text-foreground">{formatCurrency(marketUnitPrice)}</span>
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Valor mínimo viável:{' '}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(minUnitPrice!)} / unidade
                    </span>{' '}
                    (máx. {OFFER_MARKET_DOWNWARD_MARGIN_PERCENT}% abaixo do mercado)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {myOffer ? (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
              <p className="font-medium">Proposta já enviada</p>
              <p className="mt-1 text-sm">
                Valor:{' '}
                {formatCurrency(myOffer.valor)}
                {' · '}
                Prazo: {myOffer.prazo_entrega_dias} dias
              </p>
              <StatusBadge status={myOffer.status} kind="offer" className="mt-2" />
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nova proposta</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form id="offer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor total (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={minTotalPrice ?? 0}
                              {...field}
                            />
                          </FormControl>
                          {minTotalPrice != null && (
                            <p className="text-xs text-muted-foreground">
                              Mínimo para {watchedQuantity} {demand.unidade}: {formatCurrency(minTotalPrice)}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="quantidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="prazo_entrega_dias"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prazo (dias)</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="validade_dias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validade (dias)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={30} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mensagem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem</FormLabel>
                          <FormControl>
                            <textarea
                              className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                              placeholder="Detalhes da proposta..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <button
            type="button"
            onClick={() => setMobileChatOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 lg:hidden"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Chat com comprador</p>
              <p className="text-xs text-muted-foreground">
                Negocie antes de enviar ou após a proposta
              </p>
            </div>
            {messages.length > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                {messages.length}
              </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </section>

        <aside className="glass-sidebar hidden min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:h-full lg:w-72 lg:border-l xl:w-80">
          <div className="shrink-0 px-4 pt-4 pb-2 lg:px-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              Chat com comprador
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Negocie antes de enviar ou após a proposta
            </p>
          </div>

          <OfferChatPanel
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
      </div>

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
              <p className="truncate text-sm font-semibold">Chat com comprador</p>
              <p className="truncate text-xs text-muted-foreground">{demand.titulo}</p>
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

          <OfferChatPanel
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

      {showOfferFooter && (
        <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:flex-row lg:items-center lg:justify-end lg:px-6">
          <Button
            type="submit"
            form="offer-form"
            className="w-full rounded-xl font-semibold lg:w-auto"
            disabled={createOffer.isPending}
          >
            {createOffer.isPending ? 'Enviando...' : 'Enviar proposta'}
          </Button>
        </footer>
      )}
    </div>
  )
}
