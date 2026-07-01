import { Pressable, Text, View } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useRouter, type Href } from 'expo-router'
import { cn } from '@/lib/utils'

type BackButtonProps = {
  label?: string
  className?: string
  fallbackHref?: Href
  preferFallback?: boolean
}

export function BackButton({
  label = 'Voltar',
  className,
  fallbackHref = '/(app)',
  preferFallback = false,
}: BackButtonProps) {
  const router = useRouter()

  const handlePress = () => {
    if (!preferFallback && router.canGoBack()) {
      router.back()
      return
    }
    router.replace(fallbackHref)
  }

  return (
    <View className={cn('self-start', className)}>
      <Pressable onPress={handlePress} className="flex-row items-center gap-1">
        <ArrowLeft size={18} color="#2F66F3" />
        {label ? <Text className="text-brand">{label}</Text> : null}
      </Pressable>
    </View>
  )
}
