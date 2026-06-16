import { useState } from 'react'
import { toast } from 'sonner'
import { Check, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { GridSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { usePendingSuppliers, useApproveSupplier, useRejectSupplier } from '@/hooks/use-admin'
import { SUPPLIER_STATUS_LABELS } from '@keve/shared'
import { translateSupabaseError } from '@/lib/errors'

export function ApprovalsPage() {
  const { data: suppliers = [], isLoading } = usePendingSuppliers()
  const approve = useApproveSupplier()
  const reject = useRejectSupplier()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove(userId: string) {
    try {
      await approve.mutateAsync(userId)
      toast.success('Fornecedor aprovado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleReject(userId: string) {
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da recusa')
      return
    }
    try {
      await reject.mutateAsync({ userId, reason: rejectReason.trim() })
      toast.success('Fornecedor recusado')
      setRejectingId(null)
      setRejectReason('')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  return (
    <div className="space-y-6">
      {isLoading && <GridSkeleton count={3} />}

      {!isLoading && suppliers.length === 0 && (
        <EmptyState
          icon={UserCheck}
          title="Fila vazia"
          description="Não há fornecedores pendentes de aprovação no momento."
        />
      )}

      <div className="space-y-4">
        {suppliers.map((s) => (
          <Card key={s.user_id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">
                  {s.profiles?.full_name ?? 'Sem nome'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{s.profiles?.email}</p>
                {s.companies && (
                  <p className="mt-1 text-sm">
                    {s.companies.razao_social} — CNPJ {s.companies.cnpj}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {s.companies?.cidade}/{s.companies?.uf}
                </p>
              </div>
              <StatusBadge status={s.status} kind="supplier" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className="border border-border bg-transparent">
                {SUPPLIER_STATUS_LABELS[s.status] ?? s.status}
              </Badge>

              {rejectingId === s.user_id ? (
                <div className="space-y-2 rounded-lg border p-4">
                  <Label htmlFor={`reason-${s.user_id}`}>Motivo da recusa</Label>
                  <Input
                    id={`reason-${s.user_id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ex.: documentação incompleta"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={reject.isPending}
                      onClick={() => handleReject(s.user_id)}
                    >
                      Confirmar recusa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingId(null)
                        setRejectReason('')
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={approve.isPending || s.status !== 'em_revisao'}
                    onClick={() => handleApprove(s.user_id)}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={s.status !== 'em_revisao'}
                    onClick={() => setRejectingId(s.user_id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Recusar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
