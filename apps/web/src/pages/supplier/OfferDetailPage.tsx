import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { offerSchema, type OfferInput, DEMAND_STATUS_LABELS } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useDemand } from '@/hooks/use-demands'
import { useCreateOffer, useOffersForDemand } from '@/hooks/use-offers'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { useAuth } from '@/contexts/auth-context'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

export function OfferDetailPage() {
  const { demandId } = useParams<{ demandId: string }>()
  const { user } = useAuth()
  const [chatBody, setChatBody] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: demand, isLoading: demandLoading } = useDemand(demandId)
  const { data: offers = [] } = useOffersForDemand(demandId)
  const createOffer = useCreateOffer()
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(demandId, user?.id)
  const sendMessage = useSendMessage()

  useChatSubscription(demandId, user?.id)

  const myOffer = offers.find((o) => o.supplier_id === user?.id)

  const form = useForm<OfferInput>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      demand_id: demandId ?? '',
      valor: 0,
      prazo_entrega_dias: 7,
      validade_dias: 7,
      quantidade: demand?.quantidade ?? 1,
      mensagem: '',
    },
  })

  useEffect(() => {
    if (demandId) form.setValue('demand_id', demandId)
    if (demand) form.setValue('quantidade', demand.quantidade)
  }, [demandId, demand, form])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      <div className="space-y-4">
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/supplier/board">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold">{demand.titulo}</h1>
            <p className="text-sm text-muted-foreground">
              {demand.cidade}/{demand.uf} · {demand.quantidade} {demand.unidade}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demanda</CardTitle>
            <CardDescription>
              {DEMAND_STATUS_LABELS[demand.status] ?? demand.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{demand.descricao}</p>
          </CardContent>
        </Card>

        {myOffer ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
            <p className="font-medium">Proposta já enviada</p>
            <p className="mt-1 text-sm">
              Valor:{' '}
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(myOffer.valor)}
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor total (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min={0} {...field} />
                        </FormControl>
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
                  <Button type="submit" className="w-full" disabled={createOffer.isPending}>
                    {createOffer.isPending ? 'Enviando...' : 'Enviar proposta'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="flex flex-col lg:max-h-[calc(100vh-8rem)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Chat com comprador
          </CardTitle>
          <CardDescription>Negocie antes de enviar ou após a proposta</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 min-h-[240px] max-h-[400px]">
            {messagesLoading && (
              <p className="text-center text-sm text-muted-foreground">Carregando...</p>
            )}
            {!messagesLoading && messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
            )}
            {messages.map((msg) => {
              const mine = msg.sender_id === user?.id
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
          <form onSubmit={handleSendChat} className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={chatBody}
              onChange={(e) => setChatBody(e.target.value)}
              disabled={sendMessage.isPending}
            />
            <Button type="submit" size="icon" disabled={!chatBody.trim() || sendMessage.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
