import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Clock,
  FileUp,
  Loader2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { ORDER_STATUS_LABELS } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/contexts/auth-context'
import {
  useOrder,
  useOrderLogs,
  useOrderSlaDeadlines,
  useUpdateOrderStatus,
} from '@/hooks/use-orders'
import {
  createOrderAttachment,
  fetchOrderAttachments,
  type OrderAttachment,
} from '@/services/orders'
import { orderAttachmentPath, uploadFile } from '@/lib/storage'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const SLA_ACTION_LABELS: Record<string, string> = {
  inform_payment: 'Informar pagamento',
  inform_shipping: 'Informar envio',
  confirm_delivery: 'Confirmar recebimento',
  confirm_completion: 'Confirmar conclusão',
}

function useCountdown(deadlineAt: string | null) {
  const [remaining, setRemaining] = useState<string>('')

  useEffect(() => {
    if (!deadlineAt) return
    const at = deadlineAt

    function tick() {
      const diff = new Date(at).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Prazo expirado')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineAt])

  return remaining
}

function SlaCountdown({ deadlineAt, status }: { deadlineAt: string; status: string }) {
  const remaining = useCountdown(status === 'pending' ? deadlineAt : null)

  if (status !== 'pending') {
    return (
      <span className={cn('text-sm', status === 'completed' ? 'text-green-600' : 'text-destructive')}>
        {status === 'completed' ? 'Concluído no prazo' : 'Prazo expirado'}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400">
      <Clock className="h-4 w-4" />
      {remaining}
    </span>
  )
}

export function BuyerOrderDetailPage() {
  usePageTitle()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: order, isLoading: loadingOrder, error: orderError } = useOrder(id)
  const { data: logs, isLoading: loadingLogs } = useOrderLogs(id)
  const { data: slas, isLoading: loadingSlas } = useOrderSlaDeadlines(id)
  const updateStatus = useUpdateOrderStatus()

  const [attachments, setAttachments] = useState<OrderAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoadingAttachments(true)
    fetchOrderAttachments(id)
      .then(setAttachments)
      .catch(() => toast.error('Erro ao carregar anexos'))
      .finally(() => setLoadingAttachments(false))
  }, [id, order?.status])

  const pendingBuyerSla = useMemo(
    () =>
      (slas ?? []).find(
        (s) => s.status === 'pending' && s.responsible_user_id === user?.id,
      ),
    [slas, user?.id],
  )

  async function handleUploadPaymentProof(file: File) {
    if (!user || !order) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5 MB.')
      return
    }

    setUploading(true)
    try {
      const path = orderAttachmentPath(user.id, order.id, file.name)
      await uploadFile('order-attachments', path, file)
      await createOrderAttachment({
        orderId: order.id,
        uploadedBy: user.id,
        attachmentType: 'payment_proof',
        storagePath: path,
        fileName: file.name,
        mimeType: file.type,
      })
      await updateStatus.mutateAsync({ id: order.id, status: 'PAGAMENTO_INFORMADO' })
      toast.success('Pagamento informado com comprovante')
      const updated = await fetchOrderAttachments(order.id)
      setAttachments(updated)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar comprovante'))
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirmDelivery() {
    if (!order) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'ENTREGUE' })
      toast.success('Recebimento confirmado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao confirmar'))
    }
  }

  async function handleConfirmCompletion() {
    if (!order) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'CONCLUIDO' })
      toast.success('Pedido concluído')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao concluir'))
    }
  }

  async function handleCancel() {
    if (!order || !cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento')
      return
    }
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: 'CANCELADO',
        cancelReason: cancelReason.trim(),
      })
      toast.success('Pedido cancelado')
      setShowCancelForm(false)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao cancelar'))
    }
  }

  if (loadingOrder) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-8 w-64" />
        <LoadingSkeleton className="h-48 w-full" />
      </div>
    )
  }

  if (orderError || !order) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        Pedido não encontrado ou erro ao carregar.
      </Alert>
    )
  }

  const isTerminal = ['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(order.status)

  return (
    <div className="space-y-6">
      {pendingBuyerSla && (
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Ação pendente: {SLA_ACTION_LABELS[pendingBuyerSla.action] ?? pendingBuyerSla.action}
            </span>
            <SlaCountdown deadlineAt={pendingBuyerSla.deadline_at} status={pendingBuyerSla.status} />
          </div>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas ações</CardTitle>
            <CardDescription>O que você precisa fazer nesta etapa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.status === 'AGUARDANDO_CONFIRMACAO_EXTERNA' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Realize o pagamento externamente e anexe o comprovante para avançar.
                </p>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 hover:bg-muted/30">
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading || updateStatus.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUploadPaymentProof(file)
                      e.target.value = ''
                    }}
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">Enviar comprovante de pagamento</span>
                  <span className="text-xs text-muted-foreground">PDF ou imagem, máx. 5 MB</span>
                </label>
              </div>
            )}

            {order.status === 'ENVIO_INFORMADO' && (
              <Button
                onClick={() => handleConfirmDelivery()}
                disabled={updateStatus.isPending}
                className="w-full"
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar recebimento
              </Button>
            )}

            {order.status === 'ENTREGUE' && (
              <Button
                variant="accent"
                onClick={() => handleConfirmCompletion()}
                disabled={updateStatus.isPending}
                className="w-full"
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar conclusão do pedido
              </Button>
            )}

            {order.status === 'PROPOSTA_ACEITA' && (
              <p className="text-sm text-muted-foreground">
                Aguardando confirmação externa. Você será notificado quando puder informar o pagamento.
              </p>
            )}

            {order.status === 'PAGAMENTO_INFORMADO' && (
              <p className="text-sm text-muted-foreground">
                Pagamento informado. Aguardando o fornecedor informar o envio.
              </p>
            )}

            {isTerminal && (
              <p className="text-sm text-muted-foreground">
                Este pedido foi encerrado.
                {order.cancel_reason && ` Motivo: ${order.cancel_reason}`}
              </p>
            )}

            {!isTerminal && (
              <>
                <Separator />
                {!showCancelForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-destructive"
                    onClick={() => setShowCancelForm(true)}
                  >
                    Cancelar pedido
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Motivo do cancelamento"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1"
                        disabled={updateStatus.isPending}
                        onClick={() => handleCancel()}
                      >
                        Confirmar cancelamento
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCancelForm(false)}
                      >
                        Voltar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLAs e prazos</CardTitle>
            <CardDescription>Prazos por etapa do workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSlas ? (
              <LoadingSkeleton className="h-24 w-full" />
            ) : (slas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum SLA registrado.</p>
            ) : (
              <ul className="space-y-3">
                {(slas ?? []).map((sla) => (
                  <li
                    key={sla.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {SLA_ACTION_LABELS[sla.action] ?? sla.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Até {new Date(sla.deadline_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <SlaCountdown deadlineAt={sla.deadline_at} status={sla.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Anexos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAttachments ? (
            <LoadingSkeleton className="h-16 w-full" />
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum anexo enviado.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{att.file_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {att.attachment_type === 'payment_proof'
                      ? 'Comprovante'
                      : att.attachment_type === 'tracking_info'
                        ? 'Rastreio'
                        : 'Outro'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <LoadingSkeleton className="h-24 w-full" />
          ) : (logs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-4">
              {(logs ?? []).map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium">
                    {log.from_status
                      ? `${ORDER_STATUS_LABELS[log.from_status] ?? log.from_status} → `
                      : ''}
                    {ORDER_STATUS_LABELS[log.to_status] ?? log.to_status}
                  </p>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground">{log.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
