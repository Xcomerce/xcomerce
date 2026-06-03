import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { updateProfile } from '@/services/profile'
import { avatarPath, getSignedUrl, uploadFile } from '@/lib/storage'
import { getInitials, translateAuthError } from '@/lib/utils'
import { translateSupabaseError } from '@/lib/errors'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .regex(/^[\d\s()+-]+$/, 'Telefone inválido'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfilePage() {
  usePageTitle()
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
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
      toast.success('Perfil atualizado')
    } catch (err) {
      const message = translateAuthError(err instanceof Error ? err.message : 'Erro ao salvar perfil')
      setSaveError(message)
      toast.error(message)
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Meu perfil</h2>
        <p className="text-sm text-muted-foreground">Atualize seus dados pessoais e foto de perfil.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
          <CardDescription>Imagem exibida no menu e nas interações da plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarPreview ? <AvatarImage src={avatarPreview} alt={profile.full_name} /> : null}
              <AvatarFallback className="text-lg">{getInitials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-secondary"
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
          <p className="text-sm text-muted-foreground">JPG, PNG ou WebP. Máximo 5 MB.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>E-mail: {profile.email ?? '—'}</CardDescription>
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
                      <Input placeholder="Seu nome" {...field} />
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
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
