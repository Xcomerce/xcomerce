import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Mail, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { CRM_STATUS_LABELS, CRM_STATUSES, type CrmLeadStatus } from '@/services/crm'
import { useLead, useSendLeadInvite, useUpdateLead } from '@/hooks/use-crm'
import { translateSupabaseError } from '@/lib/errors'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const leadQ = useLead(id)
  const updateLead = useUpdateLead()
  const invite = useSendLeadInvite()

  const lead = leadQ.data
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CrmLeadStatus>('novo')
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes ?? '')
      setStatus(lead.status)
    }
  }, [lead])

  if (leadQ.isLoading) return <LoadingSkeleton className="h-64" />
  if (!lead) {
    return (
      <div className="space-y-6">
        <p>Lead não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/admin/leads">Voltar</Link>
        </Button>
      </div>
    )
  }

  async function save() {
    try {
      await updateLead.mutateAsync({
        id: lead!.id,
        patch: { notes, status },
      })
      toast.success('Lead atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleInvite() {
    try {
      const result = await invite.mutateAsync(lead!.id)
      if (result?.invite_url) {
        await navigator.clipboard.writeText(result.invite_url)
        toast.success('Convite enviado e link copiado')
      } else {
        toast.success('Convite enviado')
      }
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao convidar'))
    }
  }

  async function copyInviteLink() {
    if (!lead?.invite_token) {
      toast.error('Gere o convite primeiro')
      return
    }
    const role = lead.profile_type === 'supplier' ? 'supplier' : 'buyer'
    const url = `${window.location.origin}/auth/register/${role}?invite=${lead.invite_token}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  async function discard() {
    try {
      await updateLead.mutateAsync({ id: lead!.id, patch: { status: 'descartado' } })
      setStatus('descartado')
      setDiscardOpen(false)
      toast.success('Lead descartado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function toggleOptOut() {
    try {
      await updateLead.mutateAsync({
        id: lead!.id,
        patch: { email_opt_out: !lead!.email_opt_out },
      })
      toast.success(lead!.email_opt_out ? 'Opt-out removido' : 'Opt-out aplicado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/leads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold">{lead.name}</h1>
        <Badge>{CRM_STATUS_LABELS[lead.status]}</Badge>
        {lead.email_opt_out ? <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Opt-out</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">E-mail</p>
            <p className="font-medium">{lead.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Telefone</p>
            <p className="font-medium">{lead.phone || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tipo</p>
            <p className="font-medium">
              {lead.profile_type === 'supplier'
                ? 'Fornecedor'
                : lead.profile_type === 'buyer'
                  ? 'Comprador'
                  : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Origem</p>
            <p className="font-medium">{lead.source}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Criado</p>
            <p className="font-medium">{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">LGPD</p>
            <p className="font-medium">
              {lead.lgpd_consent ? `Sim — ${formatDate(lead.lgpd_consent_at)}` : 'Não'}
            </p>
          </div>
          {lead.converted_user_id ? (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Usuário convertido</p>
              <p className="font-mono text-xs font-medium">{lead.converted_user_id}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as CrmLeadStatus)}
            >
              {CRM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CRM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas</label>
            <textarea
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={updateLead.isPending}>
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={handleInvite}
              disabled={invite.isPending || lead.email_opt_out}
            >
              <Mail className="mr-1 h-4 w-4" />
              Enviar convite
            </Button>
            <Button variant="outline" onClick={copyInviteLink} disabled={!lead.invite_token}>
              <Copy className="mr-1 h-4 w-4" />
              Copiar link
            </Button>
            <Button variant="outline" onClick={toggleOptOut}>
              {lead.email_opt_out ? 'Remover opt-out' : 'Marcar opt-out'}
            </Button>
            <Button variant="destructive" onClick={() => setDiscardOpen(true)}>
              <UserX className="mr-1 h-4 w-4" />
              Descartar
            </Button>
          </div>
          {lead.invite_sent_at ? (
            <p className="text-xs text-muted-foreground">
              Último convite: {formatDate(lead.invite_sent_at)}
              {lead.invite_token ? (
                <>
                  {' '}
                  · token <span className="font-mono">{lead.invite_token.slice(0, 8)}…</span>
                </>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Descartar lead?"
        description="O lead será marcado como descartado e deixará de receber nurture."
        confirmLabel="Descartar"
        variant="destructive"
        onConfirm={discard}
      />
    </div>
  )
}
