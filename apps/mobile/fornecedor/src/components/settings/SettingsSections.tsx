import { useEffect, useState } from 'react'
import { Alert, Linking, Platform, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native'
import { Calendar, ExternalLink, Moon, Plug, Sun, User } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/contexts/auth-context'
import { useUpdateProfile } from '@/hooks/use-profile'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/use-notifications'
import { useThemePreference } from '@/hooks/use-theme-preference'
import { supabase } from '@/lib/supabase'
import { formatSupabaseError } from '@/lib/errors'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { NotificationPreference } from '@/services/notifications'
import {
  ROLE_LABELS,
  type NotificationPreferenceItem,
} from '@/config/settings'
import type { UserProfile } from '@/services/profile'
import type { UserRole } from '@keve/shared'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<UserRole, string> = {
  buyer: 'bg-blue-100 text-blue-800 border-blue-200',
  supplier: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-blue-50 text-brand border-blue-200',
  commercial: 'bg-slate-100 text-slate-700 border-slate-200',
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

function parseDeviceLabel() {
  if (Platform.OS === 'ios') return 'App no iOS'
  if (Platform.OS === 'android') return 'App no Android'
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined') {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'Safari no iOS'
      if (/Android/i.test(navigator.userAgent)) return 'Chrome no Android'
      if (/Edg\//i.test(navigator.userAgent)) return 'Microsoft Edge'
      if (/Firefox/i.test(navigator.userAgent)) return 'Firefox'
      if (/Chrome/i.test(navigator.userAgent)) return 'Google Chrome'
      if (/Safari/i.test(navigator.userAgent)) return 'Safari'
    }
    return 'Navegador web'
  }
  return 'Este dispositivo'
}

async function loadStoredTermsSections() {
  try {
    const raw = await AsyncStorage.getItem(TERMS_STORAGE_KEY)
    if (!raw) return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
    const parsed = JSON.parse(raw) as { title: string; body: string }[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
    }
    return parsed
  } catch {
    return DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
  }
}

export function AccountSettings({ profile }: { profile: UserProfile }) {
  const { user, refreshProfile } = useAuth()
  const updateProfile = useUpdateProfile()
  const [fullName, setFullName] = useState(profile.full_name)
  const [email, setEmail] = useState(profile.email ?? user?.email ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(profile.full_name)
    setEmail(profile.email ?? user?.email ?? '')
    setPhone(profile.phone ?? '')
  }, [profile, user?.email])

  const displayRole = (profile.primary_role ?? 'buyer') as UserRole
  const roleLabel = ROLE_LABELS[displayRole] ?? 'Usuário'
  const roleColor = ROLE_COLORS[displayRole] ?? ROLE_COLORS.buyer
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  const handleSave = async () => {
    if (!user) return
    setSaveError(null)

    if (fullName.trim().length < 2) {
      setSaveError('Nome deve ter no mínimo 2 caracteres.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSaveError('E-mail inválido.')
      return
    }
    if (phone.trim().length < 10) {
      setSaveError('Telefone inválido.')
      return
    }

    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })

      const currentEmail = (profile.email ?? user.email ?? '').trim().toLowerCase()
      const nextEmail = email.trim().toLowerCase()
      const emailChanged = nextEmail !== currentEmail

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() })
        if (error) throw error
      }

      await refreshProfile()

      if (emailChanged) {
        Alert.alert('Salvo', 'Confira sua caixa de entrada para confirmar o novo e-mail.')
      } else {
        Alert.alert('Salvo', 'Perfil atualizado.')
      }
    } catch (err) {
      const message = formatSupabaseError(err)
      setSaveError(message)
      Alert.alert('Erro', message)
    }
  }

  return (
    <View className="gap-6">
      <View className="gap-4">
        <View className="flex-row items-center justify-between border-b border-slate-200 pb-3">
          <View className="flex-row items-center gap-2">
            <User size={16} color="#64748b" />
            <Text className="text-sm text-slate-500">Perfil</Text>
          </View>
          <View className={cn('rounded-full border px-2.5 py-0.5', roleColor)}>
            <Text className="text-xs font-semibold">{roleLabel}</Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between pb-1">
          <View className="flex-row items-center gap-2">
            <Calendar size={16} color="#64748b" />
            <Text className="text-sm text-slate-500">Cadastro</Text>
          </View>
          <Text className="text-sm font-medium capitalize text-slate-900">{joinDate}</Text>
        </View>
      </View>

      {saveError ? (
        <View className="rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-sm text-red-700">{saveError}</Text>
        </View>
      ) : null}

      <Input label="Nome completo" value={fullName} onChangeText={setFullName} />
      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Button label="Salvar alterações" onPress={handleSave} loading={updateProfile.isPending} />
    </View>
  )
}

export function SecuritySettings() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Senha inválida', 'A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Senha inválida', 'As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Sucesso', 'Senha atualizada com sucesso!')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="gap-4">
      <Text className="text-sm text-slate-500">
        Defina uma nova senha para acessar a plataforma com segurança.
      </Text>
      <Input
        label="Nova senha"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="Nova senha (min. 6 dígitos)"
      />
      <Input
        label="Confirmar nova senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirme a nova senha"
      />
      <Button label="Alterar senha" onPress={handleSubmit} loading={loading} variant="outline" />
    </View>
  )
}

export function SessionsSettings() {
  const { session, signOut } = useAuth()
  const [signingOutOthers, setSigningOutOthers] = useState(false)
  const deviceLabel = parseDeviceLabel()

  const handleSignOutOthers = () => {
    Alert.alert('Encerrar sessões', 'Encerrar todas as outras sessões ativas nesta conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: async () => {
          setSigningOutOthers(true)
          try {
            const { error } = await supabase.auth.signOut({ scope: 'others' })
            if (error) throw error
            Alert.alert('Sucesso', 'Outras sessões encerradas com sucesso.')
          } catch (err) {
            Alert.alert('Erro', formatSupabaseError(err))
          } finally {
            setSigningOutOthers(false)
          }
        },
      },
    ])
  }

  const handleSignOut = () => {
    Alert.alert('Sair', 'Deseja sair deste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ])
  }

  return (
    <View className="gap-4">
      <Text className="text-sm text-slate-500">
        Gerencie os dispositivos conectados à sua conta. Encerre sessões que você não reconhece.
      </Text>

      <Card className="border-brand/30 bg-brand/5">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/15">
            <User size={20} color="#2F66F3" />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-sm font-medium text-slate-900">{deviceLabel}</Text>
              <Text className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand">
                Sessão atual
              </Text>
            </View>
            <Text className="mt-1 text-xs text-slate-500">
              Último acesso: {formatDateTime(session?.user?.last_sign_in_at)}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Expira em:{' '}
              {formatDateTime(
                session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
              )}
            </Text>
          </View>
        </View>
      </Card>

      <Button
        label="Encerrar outras sessões"
        variant="outline"
        onPress={handleSignOutOthers}
        loading={signingOutOthers}
      />
      <Button label="Sair deste dispositivo" variant="destructive" onPress={handleSignOut} />
    </View>
  )
}

export function NotificationPreferencesSettings({
  items,
}: {
  items: NotificationPreferenceItem[]
}) {
  const { data: preferences = [] as NotificationPreference[], isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()

  function getPreference(type: string): NotificationPreference | undefined {
    return preferences.find((pref: NotificationPreference) => pref.notification_type === type)
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
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  if (isLoading) {
    return (
      <View className="gap-3">
        {items.map((item) => (
          <View key={item.type} className="h-24 w-full rounded-xl bg-slate-200" />
        ))}
      </View>
    )
  }

  return (
    <View className="gap-3">
      {items.map((item) => (
        <Card key={item.type}>
          <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
          <Text className="mt-0.5 text-xs text-slate-500">{item.description}</Text>
          <View className="mt-3 flex-row flex-wrap gap-6">
            <View className="flex-row items-center gap-2">
              <Switch
                value={isChannelEnabled(item.type, 'in_app_enabled')}
                disabled={updatePreferences.isPending}
                onValueChange={(checked) => void handleToggle(item.type, 'in_app_enabled', checked)}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={isChannelEnabled(item.type, 'in_app_enabled') ? '#2F66F3' : '#f8fafc'}
              />
              <Text className="text-sm text-slate-700">No app</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Switch
                value={isChannelEnabled(item.type, 'email_enabled')}
                disabled={updatePreferences.isPending}
                onValueChange={(checked) => void handleToggle(item.type, 'email_enabled', checked)}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={isChannelEnabled(item.type, 'email_enabled') ? '#2F66F3' : '#f8fafc'}
              />
              <Text className="text-sm text-slate-700">E-mail</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
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

export function AppearanceSettings() {
  const { theme, setTheme, ready } = useThemePreference()

  if (!ready) {
    return (
      <View className="gap-3">
        <View className="h-16 w-full rounded-xl bg-slate-200" />
        <View className="h-16 w-full rounded-xl bg-slate-200" />
      </View>
    )
  }

  return (
    <View className="gap-3">
      <Text className="text-sm text-slate-500">
        Escolha como a interface deve ser exibida em todos os dispositivos.
      </Text>
      {THEME_OPTIONS.map((option) => {
        const selected = theme === option.id
        const Icon = option.icon
        return (
          <Pressable
            key={option.id}
            onPress={() => void setTheme(option.id)}
            className={cn(
              'flex-row items-center gap-3 rounded-xl border p-4',
              selected ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white',
            )}
          >
            <View
              className={cn(
                'h-10 w-10 items-center justify-center rounded-full',
                selected ? 'bg-brand/15' : 'bg-slate-100',
              )}
            >
              <Icon size={20} color={selected ? '#2F66F3' : '#64748b'} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-medium text-slate-900">{option.label}</Text>
              <Text className="mt-0.5 text-xs text-slate-500">{option.description}</Text>
            </View>
            <View
              className={cn(
                'h-4 w-4 rounded-full border-2',
                selected ? 'border-brand bg-brand' : 'border-slate-300',
              )}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

export function IntegrationsSettings() {
  return (
    <View className="gap-4">
      <Text className="text-sm text-slate-500">
        Conecte ferramentas externas para automatizar fluxos do seu dia a dia na plataforma.
      </Text>
      <View className="gap-3">
        {INTEGRATION_OPTIONS.map((integration) => (
          <Card key={integration.id}>
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Plug size={20} color="#64748b" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-medium text-slate-900">{integration.name}</Text>
                <Text className="mt-0.5 text-xs text-slate-500">{integration.description}</Text>
              </View>
            </View>
            <Button label={integration.status} variant="outline" disabled className="mt-3" />
          </Card>
        ))}
      </View>
    </View>
  )
}

export function PrivacySettings({ profile }: { profile: UserProfile }) {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)

  const handleExportData = async () => {
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
      const json = JSON.stringify(payload, null, 2)

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `keve-dados-${user.id.slice(0, 8)}.json`
        anchor.click()
        URL.revokeObjectURL(url)
      } else {
        await Share.share({
          message: json,
          title: `keve-dados-${user.id.slice(0, 8)}.json`,
        })
      }
      Alert.alert('Sucesso', 'Exportação concluída.')
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteRequest = () => {
    Alert.alert(
      'Excluir conta',
      'Deseja solicitar a exclusão permanente da sua conta e dos dados associados? Esta ação será analisada pela nossa equipe.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Solicitação registrada',
              'Nossa equipe entrará em contato pelo e-mail cadastrado.',
            )
          },
        },
      ],
    )
  }

  const openPrivacyPolicy = () => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_ASSETS_URL ?? 'http://localhost:5173'
    void Linking.openURL(`${webUrl}/legal/privacidade`)
  }

  return (
    <View className="gap-4">
      <Text className="text-sm text-slate-500">
        Em conformidade com a LGPD, você pode exportar seus dados ou solicitar a exclusão da conta.
      </Text>

      <Card>
        <Text className="text-sm font-medium text-slate-900">Exportar meus dados</Text>
        <Text className="mt-1 text-xs text-slate-500">
          Baixe uma cópia dos dados básicos da sua conta em formato JSON.
        </Text>
        <Button
          label="Exportar dados"
          variant="outline"
          onPress={handleExportData}
          loading={exporting}
          className="mt-3"
        />
      </Card>

      <Card>
        <Text className="text-sm font-medium text-slate-900">Política de privacidade</Text>
        <Text className="mt-1 text-xs text-slate-500">
          Saiba como coletamos, usamos e protegemos suas informações pessoais.
        </Text>
        <Pressable onPress={openPrivacyPolicy} className="mt-2 flex-row items-center gap-1">
          <Text className="text-sm font-medium text-brand">Ler política de privacidade</Text>
          <ExternalLink size={14} color="#2F66F3" />
        </Pressable>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <Text className="text-sm font-medium text-red-700">Excluir minha conta</Text>
        <Text className="mt-1 text-xs text-slate-500">
          Solicite a remoção permanente dos seus dados pessoais da plataforma.
        </Text>
        <Button
          label="Solicitar exclusão"
          variant="destructive"
          onPress={handleDeleteRequest}
          className="mt-3"
        />
      </Card>
    </View>
  )
}

export function TermsSettings() {
  const [sections, setSections] = useState<{ title: string; body: string }[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadStoredTermsSections(),
      AsyncStorage.getItem(`${TERMS_STORAGE_KEY}.updated-at`),
    ]).then(([loadedSections, storedUpdatedAt]) => {
      if (cancelled) return
      setSections(loadedSections)
      setUpdatedAt(storedUpdatedAt)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const openTerms = () => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_ASSETS_URL ?? 'http://localhost:5173'
    void Linking.openURL(`${webUrl}/legal/termos`)
  }

  return (
    <ScrollView contentContainerClassName="gap-3 pb-6">
      <Text className="text-sm text-slate-500">Última atualização: {updatedLabel}.</Text>
      {sections.map((section, index) => (
        <Card key={`${section.title}-${index}`}>
          <Text className="text-sm font-medium text-slate-900">{section.title}</Text>
          <Text className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</Text>
        </Card>
      ))}
      <Card className="bg-slate-50">
        <Text className="text-sm text-slate-700">
          Versão completa disponível em{' '}
          <Text onPress={openTerms} className="font-medium text-brand">
            /legal/termos
          </Text>
          .
        </Text>
      </Card>
    </ScrollView>
  )
}
