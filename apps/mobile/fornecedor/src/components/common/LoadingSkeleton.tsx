import { View } from 'react-native'

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View className="gap-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </View>
  )
}
