import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Camera, ChevronRight, Loader2, User, Calendar, Shield, Mail, Palette, Sun, Moon, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton, LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { updateProfile } from '@/services/profile'
import { avatarPath, getSignedUrl, uploadFile } from '@/lib/storage'
import { getInitials, translateAuthError } from '@/lib/utils'
import { translateSupabaseError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/services/profile'
import type { LucideIcon } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
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

type MobileSection = 'account' | 'personal' | 'security' | 'appearance'

const MOBILE_MENU_ITEMS: {
  id: MobileSection
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    id: 'account',
    label: 'Detalhes da conta',
    description: 'Perfil, e-mail e data de cadastro.',
    icon: User,
  },
  {
    id: 'personal',
    label: 'Dados pessoais',
    description: 'Atualize seu nome completo e telefone de contato.',
    icon: User,
  },
  {
    id: 'security',
    label: 'Segurança do acesso',
    description: 'Altere sua senha de login da plataforma.',
    icon: Shield,
  },
  {
    id: 'appearance',
    label: 'Aparência',
    description: 'Escolha entre modo claro ou escuro.',
    icon: Palette,
  },
]

export function ProfilePage() {
  usePageTitle()
  const { user, profile, refreshProfile, signOut } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [mobileSection, setMobileSection] = useState<MobileSection | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
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
      phone: profile.phone ?? '',
    })
  }, [profile, form])

  useEffect(() => {
    if (!profile?.avatar_url) {
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
  }, [profile?.avatar_url])

  async function handleAvatarChange(file: File) {
    if (!user) return
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
    if (!user) return
    setSaveError(null)
    try {
      await updateProfile(user.id, {
        full_name: values.full_name,
        phone: values.phone,
      })
      await refreshProfile()
      toast.success('Perfil updated')
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
      <div className="w-full space-y-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-1 space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="md:col-span-2 space-y-6">
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  const roleLabel = profile.primary_role === 'buyer' ? 'Comprador' : 'Fornecedor'
  const roleColor =
    profile.primary_role === 'buyer'
      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
      : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const avatarUploader = (
    <AvatarUploader
      profile={profile}
      avatarPreview={avatarPreview}
      uploadingAvatar={uploadingAvatar}
      fileInputRef={fileInputRef}
      onAvatarChange={handleAvatarChange}
    />
  )

  const accountDetails = (
    <AccountDetailsContent
      profile={profile}
      roleLabel={roleLabel}
      roleColor={roleColor}
      joinDate={joinDate}
    />
  )

  const personalDataForm = (
    <PersonalDataForm
      form={form}
      saveError={saveError}
      onSubmit={onSubmit}
    />
  )

  const securityForm = (
    <SecurityForm
      passwordForm={passwordForm}
      updatingPassword={updatingPassword}
      onPasswordSubmit={onPasswordSubmit}
    />
  )

  const mobileSectionTitle =
    MOBILE_MENU_ITEMS.find((item) => item.id === mobileSection)?.label ?? 'Configurações'

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
      {/* Mobile: menu ou sub-tela */}
      <div className="md:hidden flex flex-col min-h-0 flex-1 pb-24">
        {mobileSection ? (
          <>
            <MobileSectionHeader
              title={mobileSectionTitle}
              onBack={() => setMobileSection(null)}
            />
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {mobileSection === 'account' && accountDetails}
              {mobileSection === 'personal' && personalDataForm}
              {mobileSection === 'security' && securityForm}
              {mobileSection === 'appearance' && <AppearanceSettings />}
            </div>
          </>
        ) : (
          <div className="space-y-6 px-4 py-6">
            {avatarUploader}
            <nav className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {MOBILE_MENU_ITEMS.map((item, index) => (
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
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
                </button>
              ))}
            </nav>
            <AccountSessionActions onSignOut={signOut} />
          </div>
        )}
      </div>

      {/* Desktop: layout em grid */}
      <div className="hidden md:grid w-full flex-1 min-h-0 md:grid-cols-3 md:gap-6 overflow-hidden px-6 py-6">
        <div className="space-y-6 shrink-0 md:col-span-1 md:h-full md:overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {avatarUploader}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Detalhes da conta</CardTitle>
            </CardHeader>
            <CardContent>{accountDetails}</CardContent>
          </Card>
          <AccountSessionActions onSignOut={signOut} className="hidden md:flex" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom space-y-6 pb-6 md:col-span-2 md:h-full pr-1">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados pessoais
              </CardTitle>
              <CardDescription>Atualize seu nome completo e telefone de contato.</CardDescription>
            </CardHeader>
            <CardContent>{personalDataForm}</CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança do acesso
              </CardTitle>
              <CardDescription>Altere sua senha de login da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>{securityForm}</CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Aparência
              </CardTitle>
              <CardDescription>Escolha entre modo claro ou escuro.</CardDescription>
            </CardHeader>
            <CardContent>
              <AppearanceSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MobileSectionHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
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
      <h2 className="font-display text-base font-semibold">{title}</h2>
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

function AccountDetailsContent({
  profile,
  roleLabel,
  roleColor,
  joinDate,
}: {
  profile: UserProfile
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
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          E-mail
        </span>
        <span className="font-medium text-foreground truncate max-w-[180px]" title={profile.email ?? ''}>
          {profile.email}
        </span>
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
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>
  saveError: string | null
  onSubmit: (values: ProfileFormValues) => Promise<void>
}) {
  return (
    <>
      {saveError && (
        <Alert className="mb-4 border-destructive/50 text-destructive">{saveError}</Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" {...field} className="rounded-xl border-border/60" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-9999" {...field} className="rounded-xl border-border/60" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </form>
      </Form>
    </>
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
      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
        <FormField
          control={passwordForm.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Nova senha (min. 6 dígitos)"
                  {...field}
                  className="rounded-xl border-border/60"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={passwordForm.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirme a nova senha"
                  {...field}
                  className="rounded-xl border-border/60"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={updatingPassword}
          className="rounded-xl font-semibold shadow-sm px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
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
      </form>
    </Form>
  )
}

function AccountSessionActions({
  onSignOut,
  className,
}: {
  onSignOut: () => Promise<void>
  className?: string
}) {
  async function handleSignOut() {
    if (!window.confirm('Deseja sair da sua conta neste dispositivo?')) return
    try {
      await onSignOut()
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao sair'))
    }
  }

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive"
        onClick={() => void handleSignOut()}
      >
        <LogOut className="h-4 w-4" />
        Sair da conta
      </Button>
    </div>
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
