import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Bell, Camera, ChevronRight, Loader2, User, Calendar, Shield, Palette, Sun, Moon, MonitorSmartphone, FileLock, FileText, Plug, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CardSkeleton, LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/use-notifications'
import { updateProfile } from '@/services/profile'
import { avatarPath, getSignedUrl, uploadFile } from '@/lib/storage'
import { getInitials, translateAuthError } from '@/lib/utils'
import { translateSupabaseError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/config/navigation'
import type { UserRole } from '@keve/shared'
import type { UserProfile } from '@/services/profile'
import type { LucideIcon } from 'lucide-react'
import {
  ActiveSessionsSettings,
  IntegrationsSettings,
  PrivacyDataSettings,
  TermsOfUseSettings,
} from '@/pages/settings/SettingsSections'
import type { AppShellOutletContext } from '@/components/layout/AppShell'

const ROLE_COLORS: Record<UserRole, string> = {
  buyer:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  supplier:
    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  admin: 'bg-primary/10 text-primary border-primary/20',
  commercial: 'bg-secondary text-secondary-foreground border-border',
}

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .regex(/^[\d\s()+-]+$/, 'Telefone inválido'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  new_password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirm_password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

type SettingsSection =
  | 'account'
  | 'security'
  | 'sessions'
  | 'notifications'
  | 'appearance'
  | 'integrations'
  | 'privacy'
  | 'terms'

const SETTINGS_MENU_ITEMS: {
  id: SettingsSection
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: 'account',
    label: 'Minha conta',
    description: 'Perfil, contato, e-mail e data de cadastro.',
    icon: User,
  },
  {
    id: 'security',
    label: 'Segurança do acesso',
    description: 'Altere sua senha de login da plataforma.',
    icon: Shield,
  },
  {
    id: 'sessions',
    label: 'Sessões ativas',
    description: 'Dispositivos conectados e encerramento de sessões.',
    icon: MonitorSmartphone,
  },
  {
    id: 'notifications',
    label: 'Notificações',
    description: 'Propostas, pedidos e alertas da sua conta.',
    icon: Bell,
  },
  {
    id: 'appearance',
    label: 'Aparência',
    description: 'Escolha entre modo claro ou escuro.',
    icon: Palette,
  },
  {
    id: 'integrations',
    label: 'Integrações',
    description: 'Conecte ferramentas externas à plataforma.',
    icon: Plug,
  },
  {
    id: 'privacy',
    label: 'Privacidade / dados (LGPD)',
    description: 'Exportação, exclusão e política de privacidade.',
    icon: FileLock,
  },
  {
    id: 'terms',
    label: 'Termos de Uso',
    description: 'Regras e condições de utilização da plataforma.',
    icon: FileText,
  },
]

const ADMIN_OPERATIONAL_NOTIFICATIONS = [
  {
    type: 'admin.supplier_pending',
    label: 'Fornecedor aguardando aprovação',
    description: 'Quando um novo fornecedor entra em revisão.',
  },
  {
    type: 'subscription.past_due',
    label: 'Assinatura inadimplente',
    description: 'Quando uma assinatura entra em atraso de pagamento.',
  },
  {
    type: 'subscription.activated',
    label: 'Nova assinatura ativada',
    description: 'Quando um usuário ativa ou renova um plano pago.',
  },
] as const

const BUYER_NOTIFICATIONS = [
  {
    type: 'offer.received',
    label: 'Nova proposta recebida',
    description: 'Quando um fornecedor envia proposta em uma demanda sua.',
  },
  {
    type: 'chat.message',
    label: 'Mensagens de negociação',
    description: 'Novas mensagens no chat com fornecedores.',
  },
  {
    type: 'order.status_changed',
    label: 'Atualização de pedido',
    description: 'Mudanças de status nos seus pedidos.',
  },
  {
    type: 'sla.reminder',
    label: 'Lembrete de prazo',
    description: 'Quando uma ação sua está próxima do prazo limite.',
  },
  {
    type: 'sla.expired',
    label: 'Prazo expirado',
    description: 'Quando um prazo importante foi ultrapassado.',
  },
  {
    type: 'subscription.past_due',
    label: 'Pagamento em atraso',
    description: 'Quando há pendência no pagamento do seu plano.',
  },
  {
    type: 'subscription.activated',
    label: 'Plano ativado',
    description: 'Confirmação de ativação ou renovação do seu plano.',
  },
] as const

type NotificationPreferenceItem = {
  type: string
  label: string
  description: string
}

function resolveSettingsRole(
  activeRole: UserRole | null,
  shellRole: UserRole | null | undefined,
): UserRole | null {
  if (shellRole === 'buyer' || shellRole === 'supplier') return shellRole
  if (activeRole === 'buyer' || activeRole === 'supplier') return activeRole
  if (activeRole === 'admin' || activeRole === 'commercial') return activeRole
  if (shellRole === 'admin') return 'admin'
  return shellRole ?? activeRole
}

function isStaffContext(role: UserRole | null) {
  return role === 'admin' || role === 'commercial'
}

function getNotificationPreferences(role: UserRole | null): NotificationPreferenceItem[] | null {
  if (role === 'admin' || role === 'commercial') {
    return ADMIN_OPERATIONAL_NOTIFICATIONS.map((item) => ({ ...item }))
  }
  if (role === 'buyer') {
    return BUYER_NOTIFICATIONS.map((item) => ({ ...item }))
  }
  return null
}

export function ProfilePage() {
  usePageTitle()
  const { user, profile, refreshProfile, activeRole, roles } = useAuth()
  const { shellRole } = useOutletContext<AppShellOutletContext>()
  const settingsRole = resolveSettingsRole(activeRole, shellRole)
  const isStaff = isStaffContext(settingsRole)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [mobileSection, setMobileSection] = useState<SettingsSection | null>(null)
  const [desktopSection, setDesktopSection] = useState<SettingsSection>('account')
  const [termsEditing, setTermsEditing] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  })

  useEffect(() => {
    if (!profile) return
    form.reset({
      full_name: profile.full_name,
      email: profile.email ?? user?.email ?? '',
      phone: profile.phone ?? '',
    })
  }, [profile, user?.email, form])

  useEffect(() => {
    if (isStaff || !profile?.avatar_url) {
      setAvatarPreview(null)
      return
    }

    let cancelled = false
    getSignedUrl('documents', profile.avatar_url)
      .then((url) => {
        if (!cancelled) setAvatarPreview(url)
      })
      .catch(() => {
        if (!cancelled) setAvatarPreview(null)
      })

    return () => {
      cancelled = true
    }
  }, [isStaff, profile?.avatar_url])

  async function handleAvatarChange(file: File) {
    if (!user || isStaff) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5 MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const path = avatarPath(user.id, ext)
      await uploadFile('documents', path, file)
      await updateProfile(user.id, { avatar_url: path })
      await refreshProfile()
      const signed = await getSignedUrl('documents', path)
      setAvatarPreview(signed)
      toast.success('Avatar atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar avatar'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function onSubmit(values: ProfileFormValues) {
    if (!user || !profile) return
    setSaveError(null)
    try {
      await updateProfile(user.id, {
        full_name: values.full_name,
        phone: values.phone,
      })

      const currentEmail = (profile.email ?? user.email ?? '').trim().toLowerCase()
      const nextEmail = values.email.trim().toLowerCase()
      const emailChanged = nextEmail !== currentEmail

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: values.email.trim() })
        if (error) throw error
      }

      await refreshProfile()

      if (emailChanged) {
        toast.success('Dados salvos. Confira sua caixa de entrada para confirmar o novo e-mail.')
      } else {
        toast.success('Perfil atualizado')
      }
    } catch (err) {
      const message = translateAuthError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
      setSaveError(message)
      toast.error(message)
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: values.new_password })
      if (error) throw error
      toast.success('Senha atualizada com sucesso!')
      passwordForm.reset()
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao atualizar senha'))
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (!profile) {
    return (
      <div className="hidden md:grid w-full flex-1 min-h-0 md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 px-6 py-6">
        <div className="space-y-4">
          <CardSkeleton />
          <LoadingSkeleton className="h-40 w-full rounded-xl" />
        </div>
        <CardSkeleton />
      </div>
    )
  }

  const displayRole = settingsRole ?? profile.primary_role ?? roles[0]
  const roleLabel =
    displayRole && displayRole in ROLE_LABELS
      ? ROLE_LABELS[displayRole as UserRole]
      : 'Usuário'
  const roleColor =
    displayRole && displayRole in ROLE_COLORS
      ? ROLE_COLORS[displayRole as UserRole]
      : 'bg-muted text-muted-foreground border-border'
  const notificationPreferences = getNotificationPreferences(settingsRole)
  const showNotifications = notificationPreferences != null
  const menuItems = SETTINGS_MENU_ITEMS.filter((item) => {
    if (item.id === 'notifications') return showNotifications
    if (item.id === 'privacy') return !isStaff
    return true
  }).map((item) => {
    if (item.id === 'notifications') {
      return {
        ...item,
        description: isStaff
          ? 'Alertas operacionais do painel administrativo.'
          : 'Propostas, pedidos, mensagens e plano da sua conta.',
      }
    }
    return item
  })

  useEffect(() => {
    if (desktopSection === 'notifications' && !showNotifications) {
      setDesktopSection('account')
    }
    if (desktopSection === 'privacy' && isStaff) {
      setDesktopSection('account')
    }
    if (desktopSection !== 'terms') {
      setTermsEditing(false)
    }
  }, [desktopSection, showNotifications, isStaff])

  useEffect(() => {
    if (mobileSection !== 'terms') {
      setTermsEditing(false)
    }
  }, [mobileSection])
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const avatarSection = !isStaff ? (
    <AvatarUploader
      profile={profile}
      avatarPreview={avatarPreview}
      uploadingAvatar={uploadingAvatar}
      fileInputRef={fileInputRef}
      onAvatarChange={handleAvatarChange}
    />
  ) : null

  const myAccountContent = (
    <MyAccountContent
      roleLabel={roleLabel}
      roleColor={roleColor}
      joinDate={joinDate}
      form={form}
      saveError={saveError}
      onSubmit={onSubmit}
      className="flex-1"
    />
  )

  const securityForm = (
    <SecurityForm
      passwordForm={passwordForm}
      updatingPassword={updatingPassword}
      onPasswordSubmit={onPasswordSubmit}
    />
  )

  const notificationsSettings = notificationPreferences ? (
    <NotificationPreferencesSettings items={notificationPreferences} />
  ) : null

  const termsSettings = (
    <TermsOfUseSettings
      canEdit={isStaff}
      isEditing={termsEditing}
      onEditingChange={setTermsEditing}
      className="flex-1"
    />
  )

  function renderSectionContent(section: SettingsSection) {
    switch (section) {
      case 'account':
        return myAccountContent
      case 'security':
        return securityForm
      case 'sessions':
        return <ActiveSessionsSettings />
      case 'notifications':
        return notificationsSettings
      case 'appearance':
        return <AppearanceSettings />
      case 'integrations':
        return <IntegrationsSettings />
      case 'privacy':
        return <PrivacyDataSettings profile={profile!} />
      case 'terms':
        return termsSettings
      default:
        return null
    }
  }

  const mobileSectionTitle =
    SETTINGS_MENU_ITEMS.find((item) => item.id === mobileSection)?.label ?? 'Configurações'

  const desktopSectionMeta = SETTINGS_MENU_ITEMS.find((item) => item.id === desktopSection)

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
      {/* Mobile: menu ou sub-tela */}
      <div
        className={cn(
          'md:hidden flex min-h-0 flex-1 flex-col pb-24',
          mobileSection ? 'overflow-hidden' : 'overflow-y-auto',
        )}
      >
        {mobileSection ? (
          <>
            <MobileSectionHeader
              title={mobileSectionTitle}
              onBack={() => setMobileSection(null)}
              hideTitle={mobileSection === 'terms'}
            />
            {mobileSection === 'account' ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4">
                {myAccountContent}
              </div>
            ) : mobileSection === 'terms' ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-4">
                <SettingsSectionTitle
                  icon={FileText}
                  label="Termos de Uso"
                  trailing={
                    isStaff ? (
                      <TermsEditButton
                        isEditing={termsEditing}
                        onToggle={() => setTermsEditing((value) => !value)}
                      />
                    ) : undefined
                  }
                />
                {termsSettings}
              </div>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-custom">
                <div className="box-border w-full max-w-full px-4 py-4">
                  {renderSectionContent(mobileSection)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 px-4 py-6">
            {avatarSection}
            <nav className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMobileSection(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/40 active:bg-secondary/60',
                    index > 0 && 'border-t border-border/60',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0 self-center text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Desktop: submenu lateral + conteúdo */}
      <div className="hidden md:grid w-full flex-1 min-h-0 md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 px-6 py-6">
        <aside className="flex min-h-0 flex-col gap-4">
          {avatarSection}
          <nav className="scrollbar-custom min-h-0 flex-1 overflow-y-auto pr-1 space-y-1">
            {menuItems.map((item) => {
              const active = desktopSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDesktopSection(item.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-secondary/40',
                  )}
                >
                  <item.icon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.label}</p>
                    <p
                      className={cn(
                        'mt-0.5 text-xs leading-snug',
                        active ? 'text-primary/70' : 'text-muted-foreground',
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          {desktopSectionMeta &&
            (desktopSection === 'account' ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <SettingsSectionTitle
                  icon={desktopSectionMeta.icon}
                  label={desktopSectionMeta.label}
                />
                {myAccountContent}
              </div>
            ) : desktopSection === 'terms' ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <SettingsSectionTitle
                  icon={desktopSectionMeta.icon}
                  label={desktopSectionMeta.label}
                  trailing={
                    isStaff ? (
                      <TermsEditButton
                        isEditing={termsEditing}
                        onToggle={() => setTermsEditing((value) => !value)}
                      />
                    ) : undefined
                  }
                />
                {termsSettings}
              </div>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-custom">
                <div className="box-border w-full max-w-full space-y-6 px-4 pb-4 pt-1">
                  <SettingsSectionTitle
                    icon={desktopSectionMeta.icon}
                    label={desktopSectionMeta.label}
                  />
                  {renderSectionContent(desktopSection)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function SettingsSectionTitle({
  icon: Icon,
  label,
  trailing,
}: {
  icon: LucideIcon
  label: string
  trailing?: ReactNode
}) {
  return (
    <h2 className="mb-4 flex shrink-0 items-center gap-2 font-display text-base font-semibold">
      <Icon className="h-5 w-5 text-primary" />
      {label}
      {trailing}
    </h2>
  )
}

function TermsEditButton({
  isEditing,
  onToggle,
}: {
  isEditing: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
        isEditing
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
      aria-label={isEditing ? 'Fechar edição dos termos' : 'Editar termos de uso'}
    >
      <Pencil className="h-4 w-4" />
    </button>
  )
}

function MobileSectionHeader({
  title,
  onBack,
  hideTitle = false,
}: {
  title: string
  onBack: () => void
  hideTitle?: boolean
}) {
  return (
    <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b border-border bg-background/95 px-2 py-2 backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-secondary/50 transition-colors"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      {!hideTitle && <h2 className="font-display text-base font-semibold">{title}</h2>}
    </div>
  )
}

function AvatarUploader({
  profile,
  avatarPreview,
  uploadingAvatar,
  fileInputRef,
  onAvatarChange,
}: {
  profile: UserProfile
  avatarPreview: string | null
  uploadingAvatar: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onAvatarChange: (file: File) => void
}) {
  return (
    <div className="flex justify-center py-2">
      <div className="relative">
        <Avatar className="h-28 w-28 border border-border shadow-sm">
          {avatarPreview ? <AvatarImage src={avatarPreview} alt={profile.full_name} /> : null}
          <AvatarFallback className="text-2xl bg-muted font-bold text-foreground/80">
            {getInitials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          disabled={uploadingAvatar}
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-secondary transition-all"
          aria-label="Alterar foto"
        >
          {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onAvatarChange(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

const PROFILE_FIELD_INPUT_CLASS =
  'box-border min-w-0 w-full max-w-full rounded-xl border-border/60 shadow-none ring-0 ring-offset-0 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'

function ProfileFieldControl({ children }: { children: ReactNode }) {
  return <div className="box-border w-full max-w-full px-0.5">{children}</div>
}

function MyAccountContent({
  roleLabel,
  roleColor,
  joinDate,
  form,
  saveError,
  onSubmit,
  className,
}: {
  roleLabel: string
  roleColor: string
  joinDate: string
  form: ReturnType<typeof useForm<ProfileFormValues>>
  saveError: string | null
  onSubmit: (values: ProfileFormValues) => Promise<void>
  className?: string
}) {
  const formId = 'my-account-form'

  return (
    <div className={cn('flex min-h-0 w-full min-w-0 flex-col', className)}>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-custom">
        <div className="box-border w-full max-w-full px-4 pb-4 pt-1">
          <div className="min-w-0 space-y-8">
            <AccountDetailsContent
              roleLabel={roleLabel}
              roleColor={roleColor}
              joinDate={joinDate}
            />
            <div className="min-w-0 border-t border-border/50 pt-6">
              <PersonalDataForm
                form={form}
                saveError={saveError}
                onSubmit={onSubmit}
                formId={formId}
                hideSubmit
              />
            </div>
          </div>
        </div>
      </div>
      <PersonalDataFormFooter form={form} formId={formId} />
    </div>
  )
}

function AccountDetailsContent({
  roleLabel,
  roleColor,
  joinDate,
}: {
  roleLabel: string
  roleColor: string
  joinDate: string
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <User className="h-4 w-4" />
          Perfil
        </span>
        <Badge className={`${roleColor} border font-semibold rounded-full px-2.5 py-0.5 text-xs`}>
          {roleLabel}
        </Badge>
      </div>
      <div className="flex items-center justify-between pb-1">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Cadastro
        </span>
        <span className="font-medium text-foreground capitalize">{joinDate}</span>
      </div>
    </div>
  )
}

function PersonalDataForm({
  form,
  saveError,
  onSubmit,
  formId = 'profile-form',
  hideSubmit = false,
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>
  saveError: string | null
  onSubmit: (values: ProfileFormValues) => Promise<void>
  formId?: string
  hideSubmit?: boolean
}) {
  return (
    <>
      {saveError && (
        <Alert className="mb-4 border-destructive/50 text-destructive">{saveError}</Alert>
      )}
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="min-w-0 space-y-4"
        >
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Nome completo</FormLabel>
                <FormControl className="min-w-0 max-w-full">
                  <ProfileFieldControl>
                    <Input
                      placeholder="Seu nome"
                      {...field}
                      className={PROFILE_FIELD_INPUT_CLASS}
                    />
                  </ProfileFieldControl>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>E-mail</FormLabel>
                <FormControl className="min-w-0 max-w-full">
                  <ProfileFieldControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      {...field}
                      className={PROFILE_FIELD_INPUT_CLASS}
                    />
                  </ProfileFieldControl>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="min-w-0">
                <FormLabel>Telefone</FormLabel>
                <FormControl className="min-w-0 max-w-full">
                  <ProfileFieldControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      {...field}
                      className={PROFILE_FIELD_INPUT_CLASS}
                    />
                  </ProfileFieldControl>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!hideSubmit && (
            <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-xl font-semibold shadow-sm px-6">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          )}
        </form>
      </Form>
    </>
  )
}

function PersonalDataFormFooter({
  form,
  formId,
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>
  formId: string
}) {
  return (
    <div className="flex shrink-0 justify-end border-t border-border/50 bg-background px-4 pt-4">
      <Button
        type="submit"
        form={formId}
        disabled={form.formState.isSubmitting}
        className="rounded-xl px-6 font-semibold shadow-sm"
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar alterações'
        )}
      </Button>
    </div>
  )
}

function SecurityForm({
  passwordForm,
  updatingPassword,
  onPasswordSubmit,
}: {
  passwordForm: ReturnType<typeof useForm<PasswordFormValues>>
  updatingPassword: boolean
  onPasswordSubmit: (values: PasswordFormValues) => Promise<void>
}) {
  return (
    <Form {...passwordForm}>
      <form
        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
        className="min-w-0 max-w-full space-y-4"
      >
        <FormField
          control={passwordForm.control}
          name="new_password"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Nova senha</FormLabel>
              <FormControl className="min-w-0 max-w-full">
                <ProfileFieldControl>
                  <Input
                    type="password"
                    placeholder="Nova senha (min. 6 dígitos)"
                    {...field}
                    className={PROFILE_FIELD_INPUT_CLASS}
                  />
                </ProfileFieldControl>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={passwordForm.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl className="min-w-0 max-w-full">
                <ProfileFieldControl>
                  <Input
                    type="password"
                    placeholder="Confirme a nova senha"
                    {...field}
                    className={PROFILE_FIELD_INPUT_CLASS}
                  />
                </ProfileFieldControl>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={updatingPassword}
            className="rounded-xl border border-border bg-secondary px-6 font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80"
          >
            {updatingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Alterar senha'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

const THEME_OPTIONS = [
  {
    id: 'light' as const,
    label: 'Modo claro',
    description: 'Interface com fundo claro e texto escuro.',
    icon: Sun,
  },
  {
    id: 'dark' as const,
    label: 'Modo escuro',
    description: 'Interface com fundo escuro e texto claro.',
    icon: Moon,
  },
]

function NotificationPreferencesSettings({
  items,
}: {
  items: NotificationPreferenceItem[]
}) {
  const { data: preferences = [], isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()

  function getPreference(type: string) {
    return preferences.find((pref) => pref.notification_type === type)
  }

  function isChannelEnabled(type: string, channel: 'in_app_enabled' | 'email_enabled') {
    const pref = getPreference(type)
    return pref ? pref[channel] : true
  }

  async function handleToggle(
    type: string,
    channel: 'in_app_enabled' | 'email_enabled',
    enabled: boolean,
  ) {
    const pref = getPreference(type)

    try {
      await updatePreferences.mutateAsync([
        {
          notification_type: type,
          in_app_enabled: channel === 'in_app_enabled' ? enabled : (pref?.in_app_enabled ?? true),
          email_enabled: channel === 'email_enabled' ? enabled : (pref?.email_enabled ?? true),
        },
      ])
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar preferência'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <LoadingSkeleton key={item.type} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.type}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          </div>
          <div className="flex items-center gap-6 md:shrink-0 mt-2 md:mt-0">
            <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
              <Switch
                id={`${item.type}-in-app`}
                checked={isChannelEnabled(item.type, 'in_app_enabled')}
                disabled={updatePreferences.isPending}
                onCheckedChange={(checked) => void handleToggle(item.type, 'in_app_enabled', checked)}
              />
              No app
            </label>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
              <Switch
                id={`${item.type}-email`}
                checked={isChannelEnabled(item.type, 'email_enabled')}
                disabled={updatePreferences.isPending}
                onCheckedChange={(checked) => void handleToggle(item.type, 'email_enabled', checked)}
              />
              E-mail
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-16 w-full rounded-xl" />
        <LoadingSkeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  const activeTheme = theme === 'system' ? resolvedTheme : theme

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Escolha como a interface deve ser exibida em todos os dispositivos.
      </p>
      {THEME_OPTIONS.map((option) => {
        const selected = activeTheme === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border bg-card hover:bg-secondary/40 active:bg-secondary/60',
            )}
            aria-pressed={selected}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                selected ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
              )}
            >
              <option.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
            </div>
            <div
              className={cn(
                'h-4 w-4 shrink-0 rounded-full border-2',
                selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
              )}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
