import { useEffect, useRef, useState } from 'react'
import { CreditCard, Loader2, Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { chatAttachmentPath, uploadFile } from '@/lib/storage'
import { translateSupabaseError } from '@/lib/errors'
import { cn, getInitials } from '@/lib/utils'

const PAYMENT_QUICK_MESSAGES = [
  'Qual a chave PIX?',
  'Aceita transferência bancária?',
  'Precisa pagar tudo adianto?',
  'Emite nota fiscal?',
  'Posso pagar na retirada?',
]

type OrderPaymentChatPanelProps = {
  demandId: string
  supplierId: string
  offerId?: string | null
  supplierName: string
  className?: string
}

export function OrderPaymentChatPanel({
  demandId,
  supplierId,
  offerId,
  supplierName,
  className,
}: OrderPaymentChatPanelProps) {
  const { user } = useAuth()
  const { data: messages, isLoading, error } = useChatMessages(demandId, supplierId)
  const sendMessage = useSendMessage()
  useChatSubscription(demandId, supplierId)

  const [body, setBody] = useState('')
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(text: string, attachmentPath?: string | null) {
    if (!user || (!text.trim() && !attachmentPath)) return

    try {
      await sendMessage.mutateAsync({
        demandId,
        supplierId,
        senderId: user.id,
        recipientId: supplierId,
        body: text.trim() || '(anexo)',
        offerId: offerId ?? null,
        attachmentPath: attachmentPath ?? null,
      })
      setBody('')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      if (raw.includes('CONTACT_INFO_BLOCKED')) {
        toast.error('Não é permitido compartilhar dados de contato diretos no chat.')
      } else {
        toast.error(translateSupabaseError(raw))
      }
    }
  }

  async function handleAttachment(file: File) {
    if (!user) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5 MB.')
      return
    }

    setUploading(true)
    try {
      const path = chatAttachmentPath(user.id, file.name)
      await uploadFile('chat-attachments', path, file)
      await handleSend('', path)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar anexo'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className={cn('flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden', className)}>
      <CardHeader className="shrink-0 space-y-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            Combinar o pagamento
          </CardTitle>
          <CardDescription className="mt-1.5">
            Peça aqui a chave PIX ou os dados bancários do fornecedor. Depois de pagar, anexe o
            comprovante ao lado.
          </CardDescription>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(supplierName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{supplierName}</p>
            <p className="text-xs text-muted-foreground">Fornecedor deste pedido</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
        {error && <p className="text-sm text-destructive">Erro ao carregar mensagens.</p>}

        <div
          ref={scrollRef}
          className="flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg border bg-muted/20 p-3"
        >
          {isLoading ? (
            <div className="space-y-2">
              <LoadingSkeleton className="h-10 w-3/4" />
              <LoadingSkeleton className="h-10 w-1/2 ml-auto" />
            </div>
          ) : (messages ?? []).length === 0 ? (
            <p className="m-auto px-2 text-center text-sm text-muted-foreground">
              Comece perguntando como o fornecedor prefere receber.
            </p>
          ) : (
            (messages ?? []).map((msg) => {
              const isMine = msg.sender_id === user?.id
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                    isMine
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'mr-auto border bg-background',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  {msg.attachment_path && (
                    <p className="mt-1 text-xs opacity-80">Anexo enviado</p>
                  )}
                  <p className="mt-1 text-[10px] opacity-70">
                    {new Date(msg.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {!isLoading && (messages ?? []).length === 0 && (
          <div className="shrink-0 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Perguntas rápidas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_QUICK_MESSAGES.map((msg) => (
                <button
                  key={msg}
                  type="button"
                  onClick={() => setBody(msg)}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleAttachment(file)
              e.target.value = ''
            }}
          />
          <Input
            placeholder="Escreva sua mensagem..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend(body)
              }
            }}
            disabled={sendMessage.isPending}
            className="pr-24"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={uploading || sendMessage.isPending}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Anexar arquivo"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              disabled={!body.trim() || sendMessage.isPending}
              onClick={() => handleSend(body)}
              aria-label="Enviar mensagem"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
