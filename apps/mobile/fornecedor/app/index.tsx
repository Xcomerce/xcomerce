import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/contexts/auth-context'

export default function Index() {
  const { session, isLoading, isSupplier } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2F66F3" />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/login" />
  if (!isSupplier) return <Redirect href="/(auth)/login" />

  return <Redirect href="/(app)/board" />
}
