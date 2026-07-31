import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { formatDate } from '@/lib/utils'

export default function NotificationsScreen() {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Notificações" />
      <View className="flex-row items-center justify-between px-4 pb-2">
        <BackButton fallbackHref="/(app)/profile" />
        {notifications.length > 0 ? (
          <Button label="Marcar todas" variant="outline" onPress={() => markAll.mutate()} className="h-9 px-3" />
        ) : null}
      </View>
      {isLoading ? (
        <LoadingSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState title="Sem notificações" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => markRead.mutate(item.id)}>
              <Card className={item.read_at ? 'opacity-60' : ''}>
                <Text className="font-semibold text-slate-900">{item.title}</Text>
                <Text className="mt-1 text-sm text-slate-600">{item.body}</Text>
                <Text className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}
