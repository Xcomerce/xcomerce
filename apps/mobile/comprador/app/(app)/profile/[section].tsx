import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { BackButton } from '@/components/common/back-button'
import {
  AccountSettings,
  AppearanceSettings,
  IntegrationsSettings,
  NotificationPreferencesSettings,
  PrivacySettings,
  SecuritySettings,
  SessionsSettings,
  TermsSettings,
} from '@/components/settings/SettingsSections'
import { buyerNotificationItems } from '@/config/settings'
import { useAuth } from '@/contexts/auth-context'
import { getSectionMeta, type SettingsSection } from '@/config/settings'
import type { UserProfile } from '@/services/profile'

const VALID_SECTIONS: SettingsSection[] = [
  'account',
  'security',
  'sessions',
  'notifications',
  'appearance',
  'integrations',
  'privacy',
  'terms',
]

function isSettingsSection(value: string): value is SettingsSection {
  return VALID_SECTIONS.includes(value as SettingsSection)
}

export default function SettingsSectionScreen() {
  const { section: rawSection } = useLocalSearchParams<{ section: string }>()
  const { profile } = useAuth()
  const section = typeof rawSection === 'string' && isSettingsSection(rawSection) ? rawSection : null
  const meta = section ? getSectionMeta(section) : null

  if (!profile || !section || !meta) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50" edges={['top']}>
        <ActivityIndicator size="large" color="#2F66F3" />
      </SafeAreaView>
    )
  }

  const Icon = meta.icon
  const currentProfile: UserProfile = profile

  function renderContent() {
    switch (section) {
      case 'account':
        return <AccountSettings profile={currentProfile} />
      case 'security':
        return <SecuritySettings />
      case 'sessions':
        return <SessionsSettings />
      case 'notifications':
        return <NotificationPreferencesSettings items={buyerNotificationItems} />
      case 'appearance':
        return <AppearanceSettings />
      case 'integrations':
        return <IntegrationsSettings />
      case 'privacy':
        return <PrivacySettings profile={currentProfile} />
      case 'terms':
        return <TermsSettings />
      default:
        return null
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="border-b border-slate-200 bg-white px-4 py-3">
        <BackButton fallbackHref="/(app)/profile" />
        <View className="mt-2 flex-row items-center gap-2">
          <Icon size={20} color="#2F66F3" />
          <Text className="text-lg font-bold text-brand-dark">{meta.label}</Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-28" keyboardShouldPersistTaps="handled">
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  )
}
