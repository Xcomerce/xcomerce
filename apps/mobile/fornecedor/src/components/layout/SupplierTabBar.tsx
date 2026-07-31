import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useRouter } from 'expo-router'
import { Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Boxes, LayoutGrid, Package, User } from 'lucide-react-native'

type TabRouteName = 'board' | 'catalog' | 'fab-placeholder' | 'orders' | 'profile'

const TAB_ORDER: TabRouteName[] = ['board', 'catalog', 'fab-placeholder', 'orders', 'profile']

const TAB_META: Record<Exclude<TabRouteName, 'fab-placeholder'>, { label: string; Icon: typeof LayoutGrid }> = {
  board: { label: 'Oportunidades', Icon: LayoutGrid },
  catalog: { label: 'Catálogo', Icon: Boxes },
  orders: { label: 'Pedidos', Icon: Package },
  profile: { label: 'Perfil', Icon: User },
}

export function SupplierTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const activeRoute = state.routes[state.index]?.name
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 10 : 6)

  const navigateTo = (routeName: TabRouteName) => {
    if (routeName === 'fab-placeholder') {
      router.navigate('/(app)/board')
      return
    }
    navigation.navigate(routeName)
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        paddingTop: 8,
        paddingBottom: bottomPad,
        paddingHorizontal: 2,
        minHeight: 56 + bottomPad,
      }}
    >
      {TAB_ORDER.map((routeName) => {
        if (routeName === 'fab-placeholder') {
          return (
            <Pressable
              key={routeName}
              accessibilityRole="button"
              accessibilityLabel="Oportunidades"
              onPress={() => navigateTo(routeName)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 48 }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#3472F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <LayoutGrid size={24} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View style={{ height: 18 }} />
            </Pressable>
          )
        }

        const meta = TAB_META[routeName]
        const isFocused = activeRoute === routeName
        const color = isFocused ? '#2F66F3' : '#64748b'
        const Icon = meta.Icon

        return (
          <Pressable
            key={routeName}
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: isFocused }}
            onPress={() => navigateTo(routeName)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
              gap: 3,
              minHeight: 48,
            }}
          >
            <Icon size={22} color={color} />
            <Text
              style={{
                fontSize: 11,
                lineHeight: 13,
                color,
                textAlign: 'center',
                ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
              }}
            >
              {meta.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
