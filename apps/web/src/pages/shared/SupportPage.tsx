import { Headset, Mail, MessageCircle } from 'lucide-react'
import {
  buildMailtoUrl,
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  formatSupportHours,
  type UserRole,
} from '@keve/shared'
import { usePageTitle } from '@/hooks/use-page-title'
import { useSupportContactSettings } from '@/hooks/use-support-settings'
import { useAuth } from '@/contexts/auth-context'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { SupportContactSettingsForm } from '@/components/support/SupportContactSettingsForm'
import { Card, CardContent } from '@/components/ui/card'

function canEditSupportContacts(roles: UserRole[]) {
  return roles.includes('admin') || roles.includes('commercial')
}

export function SupportPage() {
  usePageTitle()
  const { roles } = useAuth()
  const canEdit = canEditSupportContacts(roles)
  const { data: settings, isLoading } = useSupportContactSettings()

  const email = settings?.email ?? null
  const whatsapp = settings?.whatsapp ?? null
  const mailto = buildMailtoUrl(email)
  const whatsappUrl = buildWhatsAppUrl(whatsapp)
  const horario = formatSupportHours(settings?.horario)
  const hasContacts = Boolean(email || whatsapp)

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Headset className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Suporte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {canEdit
              ? 'Visualize e edite os contatos exibidos para compradores e fornecedores.'
              : 'Precisa de ajuda com pedidos e propostas? Entre em contato com nossa equipe.'}
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton className="h-40 rounded-xl" />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 pt-6">
                {email && mailto && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">E-mail</p>
                    <a
                      href={mailto}
                      className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {email}
                    </a>
                  </div>
                )}

                {whatsapp && whatsappUrl && (
                  <div>
                    <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {formatWhatsAppDisplay(whatsapp)}
                    </a>
                  </div>
                )}

                {!hasContacts && (
                  <p className="text-sm text-muted-foreground">
                    {canEdit
                      ? 'Nenhum contato configurado ainda. Preencha os campos abaixo.'
                      : 'Os contatos de suporte ainda não foram configurados. Tente novamente em breve.'}
                  </p>
                )}

                {horario && (
                  <div className="border-t border-border/60 pt-4">
                    <p className="text-sm font-semibold text-foreground">Horário</p>
                    <p className="mt-1 text-sm text-muted-foreground">{horario}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {canEdit && <SupportContactSettingsForm />}
          </>
        )}
      </div>
    </div>
  )
}
