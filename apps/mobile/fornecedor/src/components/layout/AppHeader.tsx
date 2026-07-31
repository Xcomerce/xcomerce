import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { BrandMark } from '@/components/brand/BrandMark'
import { SupplierStatusBadge } from '@/components/common/SupplierStatusBadge'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import type { SupplierStatus } from '@keve/shared'

type AppHeaderProps = {
  title: string
  subtitle?: string
  supplierStatus?: SupplierStatus | null
}

export function AppHeader({ title, subtitle, supplierStatus }: AppHeaderProps) {
  const router = useRouter()
  const { data: unread = 0 } = useUnreadNotificationCount()

  return (
    <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <BrandMark size="md" />
        <Pressable
          onPress={() => router.push('/(app)/notifications')}
          className="relative h-10 w-10 items-center justify-center rounded-full bg-slate-100"
        >
          <Bell size={20} color="#334155" />
          {unread > 0 ? (
            <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1">
              <Text className="text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="min-w-0">
        <Text className="text-xl font-bold text-brand-dark">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {supplierStatus ? (
          <View className="mt-2">
            <SupplierStatusBadge status={supplierStatus} />
          </View>
        ) : null}
      </View>
    </View>
  )
}
