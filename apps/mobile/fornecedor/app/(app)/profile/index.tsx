import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell, ChevronRight, ClipboardList, CreditCard, HeadphonesIcon, Zap } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { useOnboardingState } from '@/hooks/use-onboarding'
import { useSubscription } from '@/hooks/use-billing'
import { SupplierStatusBadge } from '@/components/common/SupplierStatusBadge'
import { getSettingsMenuItems, type SettingsSection } from '@/config/settings'

const SUPPLIER_SHORTCUTS = [
  { label: 'Auto-proposta', description: 'Configure propostas automáticas', href: '/(app)/auto-offers', icon: Zap },
  { label: 'Onboarding', description: 'Dados da empresa e documentos', href: '/(app)/onboarding', icon: ClipboardList },
  { label: 'Plano', description: 'Assinatura e limites do catálogo', href: '/(app)/billing', icon: CreditCard },
  { label: 'Notificações', description: 'Central de alertas', href: '/(app)/notifications', icon: Bell },
  { label: 'Suporte', description: 'Fale com a equipe Keve', href: '/(app)/support', icon: HeadphonesIcon },
] as const

export default function SupplierProfileScreen() {
  const router = useRouter()
  const { profile, signOut, supplierStatus } = useAuth()
  const { data: subscription } = useSubscription()
  const { data: onboarding } = useOnboardingState()
  const menuItems = getSettingsMenuItems()

  const openSection = (section: SettingsSection) => {
    router.push({ pathname: '/(app)/profile/[section]', params: { section } })
  }

  const handleSignOut = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50" edges={['top']}>
        <ActivityIndicator size="large" color="#2F66F3" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Configurações" />
      <ScrollView contentContainerClassName="gap-6 px-4 py-6 pb-28">
        <AvatarUploader profile={profile} />

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Conta fornecedor</Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <SupplierStatusBadge status={supplierStatus} />
            {subscription?.plan?.name ? (
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-xs font-semibold text-slate-700">Plano {subscription.plan.name}</Text>
              </View>
            ) : null}
          </View>
          {onboarding?.company?.razao_social ? (
            <Text className="mt-3 text-base font-semibold text-slate-900">{onboarding.company.razao_social}</Text>
          ) : null}
          {onboarding?.company?.cnpj ? (
            <Text className="mt-1 text-sm text-slate-500">CNPJ {onboarding.company.cnpj}</Text>
          ) : null}
          {onboarding?.profile?.service_city ? (
            <Text className="mt-1 text-sm text-slate-500">
              Área: {onboarding.profile.service_city}/{onboarding.profile.service_uf} ·{' '}
              {onboarding.profile.service_radius_km} km
            </Text>
          ) : null}
        </Card>

        <View>
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Fornecedor
          </Text>
          <View className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {SUPPLIER_SHORTCUTS.map((item, index) => {
              const Icon = item.icon
              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href)}
                  className={`flex-row items-center gap-3 px-4 py-4 active:bg-slate-50 ${
                    index > 0 ? 'border-t border-slate-100' : ''
                  }`}
                >
                  <Icon size={20} color="#2F66F3" />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
                    <Text className="mt-0.5 text-xs text-slate-500">{item.description}</Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </Pressable>
              )
            })}
          </View>
        </View>

        <View className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Pressable
                key={item.id}
                onPress={() => openSection(item.id)}
                className={`flex-row items-center gap-3 px-4 py-4 active:bg-slate-50 ${
                  index > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <Icon size={20} color="#2F66F3" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-slate-900">{item.label}</Text>
                  <Text className="mt-0.5 text-xs text-slate-500">{item.description}</Text>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </Pressable>
            )
          })}
        </View>

        <Card>
          <Text className="font-semibold text-slate-800">Plano atual</Text>
          <Text className="mt-1 text-slate-600">
            {subscription?.plan?.name ?? 'Free'} · {subscription?.status ?? '—'}
          </Text>
          <Button
            label="Ver planos"
            variant="outline"
            onPress={() => router.push('/(app)/billing')}
            className="mt-3"
          />
        </Card>

        <Button label="Sair da conta" variant="destructive" onPress={handleSignOut} />
      </ScrollView>
    </SafeAreaView>
  )
}
