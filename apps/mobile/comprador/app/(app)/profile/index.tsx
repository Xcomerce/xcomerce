import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/hooks/use-billing'
import { getSettingsMenuItems, type SettingsSection } from '@/config/settings'

export default function SettingsHubScreen() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { data: subscription } = useSubscription()
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

        <View className="gap-3">
          <Button
            label="Central de notificações"
            variant="outline"
            onPress={() => router.push('/(app)/notifications')}
          />
          <Button label="Suporte" variant="outline" onPress={() => router.push('/(app)/support')} />
          <Button label="Sair da conta" variant="destructive" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
