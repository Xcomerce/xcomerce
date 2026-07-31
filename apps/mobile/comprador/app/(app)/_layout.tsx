import { Redirect, Tabs } from 'expo-router'

import { ActivityIndicator, View } from 'react-native'

import { LayoutGrid, LayoutList, Package, User } from 'lucide-react-native'

import { useAuth } from '@/contexts/auth-context'

import { AppTabBar } from '@/components/layout/AppTabBar'



function TabIcon({ Icon, color }: { Icon: typeof LayoutGrid; color: string }) {

  return <Icon size={22} color={color} />

}



export default function AppLayout() {

  const { session, isLoading, isBuyer } = useAuth()



  if (isLoading) {

    return (

      <View className="flex-1 items-center justify-center bg-white">

        <ActivityIndicator size="large" color="#2F66F3" />

      </View>

    )

  }



  if (!session || !isBuyer) return <Redirect href="/(auth)/login" />



  return (

    <Tabs

      tabBar={(props) => <AppTabBar {...props} />}

      screenOptions={{

        headerShown: false,

        tabBarShowLabel: false,

      }}

    >

      <Tabs.Screen

        name="index"

        options={{

          title: 'Feed',

          tabBarIcon: ({ color }) => <TabIcon Icon={LayoutGrid} color={color} />,

        }}

      />

      <Tabs.Screen

        name="demands"

        options={{

          title: 'Ofertas',

          tabBarIcon: ({ color }) => <TabIcon Icon={LayoutList} color={color} />,

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

      <Tabs.Screen name="billing" options={{ href: null }} />

      <Tabs.Screen name="notifications" options={{ href: null }} />

      <Tabs.Screen name="support" options={{ href: null }} />

      <Tabs.Screen name="request-offer" options={{ href: null }} />

    </Tabs>

  )

}

