import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Loader2, User, Calendar, Shield, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { updateProfile } from '@/services/profile'
import { avatarPath, getSignedUrl, uploadFile } from '@/lib/storage'
import { getInitials, translateAuthError } from '@/lib/utils'
import { translateSupabaseError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

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

export function ProfilePage() {
  usePageTitle()
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [updatingPassword, setUpdatingPassword] = useState(false)

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
  const roleColor = profile.primary_role === 'buyer' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
      <div className="w-full flex-1 min-h-0 flex flex-col md:grid md:grid-cols-3 md:gap-6 overflow-visible md:overflow-hidden px-4 py-6 md:px-6">
        {/* Left Column: Profile Picture & Account details */}
        <div className="space-y-6 shrink-0 md:col-span-1 md:h-full md:overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {/* Avatar Card */}
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Foto de perfil</CardTitle>
              <CardDescription>Imagem exibida no menu e interações.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6 text-center space-y-4">
              <div className="relative">
                <Avatar className="h-28 w-28 border border-border shadow-sm">
                  {avatarPreview ? <AvatarImage src={avatarPreview} alt={profile.full_name} /> : null}
                  <AvatarFallback className="text-2xl bg-muted font-bold text-foreground/80">{getInitials(profile.full_name)}</AvatarFallback>
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
                    if (file) void handleAvatarChange(file)
                    e.target.value = ''
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máximo 5 MB.</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Details Card */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Detalhes da conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Perfil
                </span>
                <Badge className={`${roleColor} border font-semibold rounded-full px-2.5 py-0.5 text-xs`}>
                  {roleLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  E-mail
                </span>
                <span className="font-medium text-foreground truncate max-w-[150px]" title={profile.email ?? ''}>
                  {profile.email}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Cadastro
                </span>
                <span className="font-medium text-foreground capitalize">
                  {joinDate}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Personal Data & Security */}
        <div className="flex-1 min-h-0 overflow-visible md:overflow-y-auto scrollbar-custom space-y-6 pb-24 md:col-span-2 md:h-full md:pb-6 pr-1">
          {/* Personal Data Form */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados pessoais
              </CardTitle>
              <CardDescription>Atualize seu nome completo e telefone de contato.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Security / Password Form */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança do acesso
              </CardTitle>
              <CardDescription>Altere sua senha de login da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Nova senha (min. 6 dígitos)" {...field} className="rounded-xl border-border/60" />
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
                          <Input type="password" placeholder="Confirme a nova senha" {...field} className="rounded-xl border-border/60" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updatingPassword} className="rounded-xl font-semibold shadow-sm px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
