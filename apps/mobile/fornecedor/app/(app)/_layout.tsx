import { Redirect, Tabs } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { Boxes, LayoutGrid, Package, User } from 'lucide-react-native'
import { useAuth } from '@/contexts/auth-context'
import { SupplierTabBar } from '@/components/layout/SupplierTabBar'

function TabIcon({ Icon, color }: { Icon: typeof LayoutGrid; color: string }) {
  return <Icon size={22} color={color} />
}

export default function AppLayout() {
  const { session, isLoading, isSupplier } = useAuth()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2F66F3" />
      </View>
    )
  }

  if (!session || !isSupplier) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      tabBar={(props) => <SupplierTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="board"
        options={{
          title: 'Oportunidades',
          tabBarIcon: ({ color }) => <TabIcon Icon={LayoutGrid} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color }) => <TabIcon Icon={Boxes} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fab-placeholder"
        options={{
          title: '',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <TabIcon Icon={Package} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon Icon={User} color={color} />,
        }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="auto-offers" options={{ href: null }} />
      <Tabs.Screen name="offers/[demandId]" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
    </Tabs>
  )
}
