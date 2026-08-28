import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, MessageSquare, Send, X } from 'lucide-react'
import {
  createOfferSchema,
  type OfferInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { OfferItemsTable, OfferProposalSummary } from '@/components/supplier/OfferItemsTable'
import { DemandSpecificationsTable } from '@/components/buyer/DemandSpecificationsTable'
import { demandHasVariantSpecs } from '@keve/shared'
import { useDemand } from '@/hooks/use-demands'
import { useCategories } from '@/hooks/use-categories'
import { useCreateOffer, useOffersForDemand } from '@/hooks/use-offers'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { matchKeys } from '@/hooks/use-matches'
import { translateSupabaseError } from '@/lib/errors'
import { formatDemandDateTime, formatDateTimeLocalInput, parseDateTimeLocalInput } from '@/lib/datetime'
import {
  buildOfferLineItemsFromDemand,
  buildOfferLineItemsFromOffer,
  offerLineItemsToEspecificacoes,
  roundCurrency,
  sumOfferLineQuantity,
  sumOfferLineTotal,
  type OfferLineItem,
} from '@/lib/offer-variant-pricing'
import { fetchSupplierCatalogUnitPriceForDemand } from '@/services/pricing'
import { markViewedByDemand } from '@/services/matches'
import { cn, formatExpiresAt } from '@/lib/utils'
import { ScrollPageShell, SCROLL_PAGE_SECTION_CLASS } from '@/components/layout/ScrollPageShell'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDemandDate(value: string | null | undefined): string {
  return formatDemandDateTime(value)
}

function formatDemandReferenceId(demandId: string): string {
  const compact = demandId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `#SC-${compact.slice(0, 4)}-${compact.slice(4)}`
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

function OfferConditionsFields({
  form,
  demandDeadline,
}: {
  form: ReturnType<typeof useForm<OfferInput>>
  demandDeadline?: string | null
}) {
  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name="prazo_entrega_em"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Prazo de entrega</FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                value={formatDateTimeLocalInput(field.value)}
                onChange={(event) => field.onChange(parseDateTimeLocalInput(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {demandDeadline ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => form.setValue('prazo_entrega_em', demandDeadline, { shouldValidate: true })}
        >
          Usar prazo solicitado pelo comprador
        </Button>
      ) : null}
      <FormField
        control={form.control}
        name="mensagem"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mensagem (opcional)</FormLabel>
            <FormControl>
              <textarea
                className="scrollbar-custom flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="Detalhes da proposta..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

export function OfferDetailPage() {
  const { demandId } = useParams<{ demandId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [chatBody, setChatBody] = useState('')
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [catalogUnitPrice, setCatalogUnitPrice] = useState<number | null>(null)
  const [lineItems, setLineItems] = useState<OfferLineItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: demand, isLoading: demandLoading } = useDemand(demandId)
  const { data: categories = [] } = useCategories()
  const { data: offers = [] } = useOffersForDemand(demandId)
  const createOffer = useCreateOffer()
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(demandId, user?.id)
  const sendMessage = useSendMessage()

  useChatSubscription(demandId, user?.id)

  useEffect(() => {
    if (!demandId || !user?.id) return
    void markViewedByDemand(user.id, demandId).then(() => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    })
  }, [demandId, user?.id, queryClient])

  const myOffer = offers.find((o) => o.supplier_id === user?.id)
  const showOfferForm = !myOffer

  const offerSchemaResolved = useMemo(() => createOfferSchema(), [])

  const form = useForm<OfferInput>({
    resolver: zodResolver(offerSchemaResolved),
    defaultValues: {
      demand_id: demandId ?? '',
      valor: 0,
      prazo_entrega_em: '',
      validade_dias: 7,
      quantidade: 1,
      mensagem: '',
    },
  })

  const categoryName = useMemo(
    () => categories.find((c) => c.id === demand?.category_id)?.name,
    [categories, demand?.category_id],
  )

  const expiresInfo = useMemo(
    () => (demand ? formatExpiresAt(demand.expires_at) : null),
    [demand?.expires_at, demand],
  )

  const totalQuantity = useMemo(() => sumOfferLineQuantity(lineItems), [lineItems])
  const totalValue = useMemo(() => roundCurrency(sumOfferLineTotal(lineItems)), [lineItems])

  const submittedLineItems = useMemo(() => {
    if (!demand || !myOffer) return []
    return buildOfferLineItemsFromOffer(myOffer, demand)
  }, [demand, myOffer])

  useEffect(() => {
    if (demandId) form.setValue('demand_id', demandId)
  }, [demandId, form])

  useEffect(() => {
    if (!demand?.prazo_desejado || form.getValues('prazo_entrega_em')) return
    form.setValue('prazo_entrega_em', demand.prazo_desejado)
  }, [demand?.prazo_desejado, form])

  useEffect(() => {
    if (!demand || !user?.id || !demandId) return

    let cancelled = false

    fetchSupplierCatalogUnitPriceForDemand(user.id, demandId, demand)
      .then((price) => {
        if (!cancelled) setCatalogUnitPrice(price)
      })
      .catch(() => {
        if (!cancelled) setCatalogUnitPrice(null)
      })

    return () => {
      cancelled = true
    }
  }, [demand, demandId, user?.id])

  useEffect(() => {
    if (!demand) return

    const defaultPrice = catalogUnitPrice ?? 0
    setLineItems((previous) => {
      if (previous.length === 0) {
        return buildOfferLineItemsFromDemand(demand, defaultPrice)
      }

      if (defaultPrice <= 0) return previous

      return previous.map((item) =>
        item.precoUnitario === 0 ? { ...item, precoUnitario: defaultPrice } : item,
      )
    })
  }, [demand, catalogUnitPrice])

  useEffect(() => {
    if (!showOfferForm) return
    form.setValue('valor', totalValue)
    form.setValue('quantidade', totalQuantity)
  }, [form, showOfferForm, totalQuantity, totalValue])

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
    if (lineItems.length === 0) {
      toast.error('Inclua ao menos um item na proposta')
      return
    }

    try {
      await createOffer.mutateAsync({
        ...values,
        valor: totalValue,
        quantidade: totalQuantity,
        especificacoes: offerLineItemsToEspecificacoes(lineItems),
      })
      toast.success('Proposta enviada')
      form.reset({
        ...values,
        valor: totalValue,
        quantidade: totalQuantity,
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
        <p className="text-muted-foreground">Solicitação não encontrada.</p>
        <Button className="mt-4" asChild>
          <Link to="/supplier/board">Voltar ao mural</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <ScrollPageShell className="min-h-0 flex-1">
        <section className={cn(SCROLL_PAGE_SECTION_CLASS, 'space-y-6')}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold">{demand.titulo}</h1>
                <StatusBadge status={demand.status} kind="demand" />
              </div>
              <p className="text-sm text-muted-foreground">
                {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                ID da solicitação
              </p>
              <p className="text-sm font-semibold text-foreground">{formatDemandReferenceId(demand.id)}</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes da solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demand.descricao ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{demand.descricao}</p>
              ) : null}

              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Categoria
                  </dt>
                  <dd className="text-sm font-medium break-words">{categoryName ?? '—'}</dd>
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
                    Data da solicitação
                  </dt>
                  <dd className="text-sm font-medium break-words">
                    {formatDemandDate(demand.published_at ?? demand.created_at)}
                  </dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Prazo desejado pelo comprador
                  </dt>
                  <dd className="text-sm font-medium break-words">{formatDemandDate(demand.prazo_desejado)}</dd>
                </div>
                {expiresInfo ? (
                  <div className="min-w-0 space-y-0.5 sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Validade da solicitação
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
                ) : null}
              </dl>

              {demand.observacoes ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Observações do comprador
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{demand.observacoes}</p>
                </div>
              ) : null}

              {demandHasVariantSpecs(demand) ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Especificações solicitadas
                  </p>
                  <DemandSpecificationsTable demand={demand} unidade={demand.unidade} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {myOffer ? (
            <>
              <OfferItemsTable
                demand={demand}
                items={submittedLineItems}
                unidade={demand.unidade}
                readOnly
              />
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <p className="font-medium">Proposta já enviada</p>
                <p className="mt-1 text-sm">
                  Valor: {formatCurrency(myOffer.valor)}
                  {' · '}
                  Prazo: {formatDemandDate((myOffer as { prazo_entrega_em?: string | null }).prazo_entrega_em) || `${myOffer.prazo_entrega_dias} dias`}
                </p>
                <StatusBadge status={myOffer.status} kind="offer" className="mt-2" />
              </Alert>
            </>
          ) : (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <OfferItemsTable
                  demand={demand}
                  items={lineItems}
                  unidade={demand.unidade}
                  onChange={setLineItems}
                />

                <div className="lg:hidden">
                  <OfferProposalSummary
                    totalQuantity={totalQuantity}
                    totalValue={totalValue}
                    unidade={demand.unidade}
                  />
                </div>

                <Form {...form}>
                  <form id="offer-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <OfferConditionsFields form={form} demandDeadline={demand.prazo_desejado} />
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

        <aside className="glass-sidebar hidden min-h-0 w-full shrink-0 flex-col overflow-hidden lg:flex lg:h-full lg:w-80 lg:border-l xl:w-96">
          <div className="shrink-0 px-4 pt-4 pb-2 lg:px-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              Chat com comprador
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
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
            className="min-h-[220px] max-h-[42vh]"
          />

          {showOfferForm ? (
            <div className="scrollbar-custom shrink-0 space-y-4 border-t border-sidebar-border bg-background p-4 lg:p-6">
              <OfferProposalSummary
                totalQuantity={totalQuantity}
                totalValue={totalValue}
                unidade={demand.unidade}
              />
              <Button
                type="submit"
                form="offer-form"
                className="w-full rounded-xl font-semibold"
                disabled={createOffer.isPending || totalValue <= 0 || lineItems.length === 0}
              >
                {createOffer.isPending ? 'Enviando...' : 'Enviar proposta'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Ao enviar, você concorda com os termos da plataforma.
              </p>
            </div>
          ) : null}
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

      {showOfferForm && (
        <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:hidden">
          <Button
            type="submit"
            form="offer-form"
            className="w-full rounded-xl font-semibold"
            disabled={createOffer.isPending || totalValue <= 0 || lineItems.length === 0}
          >
            {createOffer.isPending ? 'Enviando...' : 'Enviar proposta'}
          </Button>
        </footer>
      )}
    </div>
  )
}
