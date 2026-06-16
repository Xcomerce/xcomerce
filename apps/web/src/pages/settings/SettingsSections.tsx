import { useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, Loader2, MonitorSmartphone, Plug, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/services/profile'

function parseDeviceLabel(userAgent: string) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'Safari no iOS'
  if (/Android/i.test(userAgent)) return 'Chrome no Android'
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge'
  if (/Firefox/i.test(userAgent)) return 'Firefox'
  if (/Chrome/i.test(userAgent)) return 'Google Chrome'
  if (/Safari/i.test(userAgent)) return 'Safari'
  return 'Navegador web'
}

function formatDateTime(value: string | undefined | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActiveSessionsSettings() {
  const { session, signOut } = useAuth()
  const [signingOutOthers, setSigningOutOthers] = useState(false)

  const deviceLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Este dispositivo'
    return parseDeviceLabel(navigator.userAgent)
  }, [])

  async function handleSignOutOthers() {
    if (!window.confirm('Encerrar todas as outras sessões ativas nesta conta?')) return

    setSigningOutOthers(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
      toast.success('Outras sessões encerradas com sucesso.')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao encerrar sessões'))
    } finally {
      setSigningOutOthers(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gerencie os dispositivos conectados à sua conta. Encerre sessões que você não reconhece.
      </p>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{deviceLabel}</p>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Sessão atual
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Último acesso: {formatDateTime(session?.user?.last_sign_in_at)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Expira em: {formatDateTime(session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={signingOutOthers}
          onClick={() => void handleSignOutOthers()}
        >
          {signingOutOthers ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Encerrando...
            </>
          ) : (
            'Encerrar outras sessões'
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void signOut()}
        >
          Sair deste dispositivo
        </Button>
      </div>
    </div>
  )
}

export function PrivacyDataSettings({ profile }: { profile: UserProfile }) {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)

  async function handleExportData() {
    if (!user) return

    setExporting(true)
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        },
        profile,
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `keve-dados-${user.id.slice(0, 8)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Exportação concluída.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

  function handleDeleteRequest() {
    if (
      !window.confirm(
        'Deseja solicitar a exclusão permanente da sua conta e dos dados associados? Esta ação será analisada pela nossa equipe.',
      )
    ) {
      return
    }

    toast.success('Solicitação registrada. Nossa equipe entrará em contato pelo e-mail cadastrado.')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Em conformidade com a LGPD, você pode exportar seus dados ou solicitar a exclusão da conta.
      </p>

      <div className="space-y-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Exportar meus dados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Baixe uma cópia dos dados básicos da sua conta em formato JSON.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-xl"
            disabled={exporting}
            onClick={() => void handleExportData()}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar dados
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Política de privacidade</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saiba como coletamos, usamos e protegemos suas informações pessoais.
          </p>
          <Button type="button" variant="link" className="mt-1 h-auto px-0 text-primary" asChild>
            <a href="/legal/privacidade" target="_blank" rel="noopener noreferrer">
              Ler política de privacidade
              <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Excluir minha conta</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solicite a remoção permanente dos seus dados pessoais da plataforma.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDeleteRequest}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Solicitar exclusão
          </Button>
        </div>
      </div>
    </div>
  )
}

const TERMS_STORAGE_KEY = 'keve.admin.terms-of-use'

const DEFAULT_TERMS_SECTIONS = [
  {
    title: '1. Aceitação dos termos',
    body: 'Ao utilizar a plataforma X COMERCE, você concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize os serviços.',
  },
  {
    title: '2. Uso da plataforma',
    body: 'A plataforma conecta compradores e fornecedores para negociação B2B. É proibido usar o serviço para fins ilícitos, fraudulentos ou que violem direitos de terceiros.',
  },
  {
    title: '3. Conta e responsabilidades',
    body: 'Você é responsável por manter suas credenciais em sigilo e pelas atividades realizadas na sua conta. Informações cadastrais devem ser verdadeiras e atualizadas.',
  },
  {
    title: '4. Planos e pagamentos',
    body: 'Funcionalidades podem variar conforme o plano contratado. Valores, limites e condições de cobrança são informados no momento da contratação ou upgrade.',
  },
  {
    title: '5. Conteúdo e propriedade intelectual',
    body: 'Marcas, layout e tecnologia da plataforma pertencem à X COMERCE. Conteúdos enviados pelos usuários permanecem de sua titularidade, concedendo licença de uso para operação do serviço.',
  },
  {
    title: '6. Limitação de responsabilidade',
    body: 'A plataforma facilita conexões comerciais, mas não garante o fechamento de negócios nem se responsabiliza por acordos firmados entre as partes.',
  },
  {
    title: '7. Alterações e contato',
    body: 'Estes termos podem ser atualizados periodicamente. O uso continuado após alterações implica concordância. Dúvidas podem ser encaminhadas pelo canal de suporte.',
  },
] as const

type TermsSectionContent = {
  title: string
  body: string
}

function loadStoredTermsSections(): TermsSectionContent[] {
  if (typeof window === 'undefined') {
    return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
  }

  try {
    const raw = window.localStorage.getItem(TERMS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
    }

    const parsed = JSON.parse(raw) as TermsSectionContent[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
    }

    return parsed
  } catch {
    return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
  }
}

export function TermsOfUseSettings({
  canEdit = false,
  isEditing = false,
  onEditingChange,
  className,
}: {
  canEdit?: boolean
  isEditing?: boolean
  onEditingChange?: (value: boolean) => void
  className?: string
}) {
  const [sections, setSections] = useState<TermsSectionContent[]>(() => loadStoredTermsSections())
  const [draftSections, setDraftSections] = useState<TermsSectionContent[]>(sections)
  const [updatedAt, setUpdatedAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`${TERMS_STORAGE_KEY}.updated-at`)
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setDraftSections(sections)
    }
  }, [isEditing, sections])

  function handleDraftChange(index: number, field: keyof TermsSectionContent, value: string) {
    setDraftSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section,
      ),
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const timestamp = new Date().toISOString()
      window.localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify(draftSections))
      window.localStorage.setItem(`${TERMS_STORAGE_KEY}.updated-at`, timestamp)
      setSections(draftSections)
      setUpdatedAt(timestamp)
      onEditingChange?.(false)
      toast.success('Termos de uso atualizados.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar termos')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraftSections(sections)
    onEditingChange?.(false)
  }

  const displaySections = isEditing ? draftSections : sections
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-col', className)}>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-custom">
        <div className="box-border w-full max-w-full px-1 pb-4">
          <p className="text-sm text-muted-foreground">Última atualização: {updatedLabel}.</p>

          <div className="mt-4 space-y-3">
            {displaySections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="rounded-xl border border-border p-4">
                {isEditing && canEdit ? (
                  <div className="space-y-3">
                    <Input
                      value={section.title}
                      onChange={(event) => handleDraftChange(index, 'title', event.target.value)}
                      className="rounded-xl border-border/60 font-medium focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0"
                    />
                    <textarea
                      value={section.body}
                      onChange={(event) => handleDraftChange(index, 'body', event.target.value)}
                      rows={4}
                      className="flex min-h-[96px] w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium">{section.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                  </>
                )}
              </div>
            ))}
          </div>

          {!isEditing && (
            <Alert className="mt-4 border-border bg-secondary/20 text-foreground">
              Versão completa disponível em{' '}
              <a href="/legal/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
                /legal/termos
              </a>
              .
            </Alert>
          )}
        </div>
      </div>

      {isEditing && canEdit && (
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 bg-background px-4 pt-4">
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" className="rounded-xl" disabled={saving} onClick={() => void handleSave()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar termos'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

const INTEGRATION_OPTIONS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Receba alertas e responda contatos diretamente pelo WhatsApp.',
    status: 'Em breve',
  },
  {
    id: 'erp',
    name: 'ERP / Estoque',
    description: 'Sincronize catálogo, pedidos e disponibilidade com seu sistema.',
    status: 'Em breve',
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Envie eventos da plataforma para URLs externas em tempo real.',
    status: 'Em breve',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Agende follow-ups e prazos de negociação no seu calendário.',
    status: 'Em breve',
  },
] as const

export function IntegrationsSettings() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conecte ferramentas externas para automatizar fluxos do seu dia a dia na plataforma.
      </p>

      <div className="space-y-3">
        {INTEGRATION_OPTIONS.map((integration) => (
          <div
            key={integration.id}
            className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Plug className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{integration.description}</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="rounded-xl shrink-0" disabled>
              {integration.status}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-3">
      <LoadingSkeleton className="h-4 w-full max-w-md" />
      <LoadingSkeleton className="h-24 w-full rounded-xl" />
      <LoadingSkeleton className="h-24 w-full rounded-xl" />
    </div>
  )
}
