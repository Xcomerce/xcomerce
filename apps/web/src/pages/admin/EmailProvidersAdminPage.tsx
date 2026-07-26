import { toast } from 'sonner'
import { CheckCircle2, Mail, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useEmailProviders,
  useSetDefaultProvider,
  useSetProviderEnabled,
} from '@/hooks/use-crm'
import { translateSupabaseError } from '@/lib/errors'

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  planned: 'Em breve',
  disabled: 'Desativado',
}

export function EmailProvidersAdminPage() {
  const providersQ = useEmailProviders()
  const setDefault = useSetDefaultProvider()
  const setEnabled = useSetProviderEnabled()

  if (providersQ.isLoading) return <LoadingSkeleton className="h-64" />
  if (!providersQ.data?.length) {
    return (
      <EmptyState
        icon={Server}
        title="Nenhum provider"
        description="Rode a migration para cadastrar Hostinger, Brevo e Resend."
      />
    )
  }

  async function makeDefault(id: string) {
    try {
      await setDefault.mutateAsync(id)
      toast.success('Provider padrão atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      await setEnabled.mutateAsync({ id, enabled })
      toast.success(enabled ? 'Provider habilitado' : 'Provider desabilitado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Provedores de e-mail</h1>
        <p className="text-sm text-muted-foreground">
          Hostinger SMTP no v1. Secrets ficam nas Edge Functions — nunca no banco.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providersQ.data.map((p) => {
          const cfg = p.config ?? {}
          const isPlanned = p.status === 'planned'
          return (
            <Card key={p.id} className={p.is_default ? 'border-primary' : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </div>
                  <Badge>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
                <CardDescription className="font-mono text-xs">{p.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {p.kind === 'smtp' ? (
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Host: {String(cfg.host ?? '—')}</li>
                    <li>Porta: {String(cfg.port ?? '—')}</li>
                    <li>From: {String(cfg.from_email ?? '—')}</li>
                    <li>Nome: {String(cfg.from_name ?? '—')}</li>
                    <li>Secrets: {p.secrets_ref ?? '—'}</li>
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    {isPlanned
                      ? 'Integração HTTP prevista para a fase 2.'
                      : `API: ${String(cfg.api_base_url ?? '—')}`}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {p.is_default ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Padrão
                    </Badge>
                  ) : null}
                  {p.is_enabled ? (
                    <Badge className="border-sky-200 bg-sky-50 text-sky-800">Habilitado</Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground">Desabilitado</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {p.status === 'active' ? (
                    <>
                      {!p.is_default ? (
                        <Button
                          size="sm"
                          onClick={() => makeDefault(p.id)}
                          disabled={setDefault.isPending}
                        >
                          Definir padrão
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle(p.id, !p.is_enabled)}
                        disabled={setEnabled.isPending || p.is_default}
                      >
                        {p.is_enabled ? 'Desabilitar' : 'Habilitar'}
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Integração em breve</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
