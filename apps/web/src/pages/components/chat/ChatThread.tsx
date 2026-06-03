import { useEffect, useRef, useState } from 'react'
import { Loader2, Paperclip, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { useChatMessages, useSendMessage, useChatSubscription } from '@/hooks/use-chat'
import { chatAttachmentPath, uploadFile } from '@/lib/storage'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type ChatThreadProps = {
  demandId: string
  supplierId: string
  recipientId: string
  offerId?: string | null
  contactRevealed?: boolean
  supplierName?: string | null
  className?: string
}

export function ChatThread({
  demandId,
  supplierId,
  recipientId,
  offerId,
  contactRevealed = false,
  supplierName,
  className,
}: ChatThreadProps) {
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
        recipientId,
        body: text.trim() || '(anexo)',
        offerId: offerId ?? null,
        attachmentPath: attachmentPath ?? null,
      })
      setBody('')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      if (raw.includes('CONTACT_INFO_BLOCKED')) {
        toast.error('Não é permitido compartilhar dados de contato antes da revelação.')
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
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Chat{supplierName ? ` · ${supplierName}` : ''}
        </CardTitle>
        {!contactRevealed && (
          <p className="text-xs text-muted-foreground">
            Dados de contato bloqueados até revelar ou aceitar a proposta.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex min-h-[280px] flex-1 flex-col gap-3">
        {error && (
          <p className="text-sm text-destructive">Erro ao carregar mensagens.</p>
        )}

        <div
          ref={scrollRef}
          className="flex max-h-64 min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3"
        >
          {isLoading ? (
            <div className="space-y-2">
              <LoadingSkeleton className="h-10 w-3/4" />
              <LoadingSkeleton className="h-10 w-1/2 ml-auto" />
            </div>
          ) : (messages ?? []).length === 0 ? (
            <p className="m-auto text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Inicie a negociação.
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
                      : 'mr-auto bg-background border',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  {msg.attachment_path && (
                    <p className="mt-1 text-xs opacity-80">📎 Anexo enviado</p>
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

        <div className="flex gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={uploading || sendMessage.isPending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar arquivo"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Input
            placeholder="Digite sua mensagem..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend(body)
              }
            }}
            disabled={sendMessage.isPending}
          />
          <Button
            type="button"
            size="icon"
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
      </CardContent>
    </Card>
  )
}
