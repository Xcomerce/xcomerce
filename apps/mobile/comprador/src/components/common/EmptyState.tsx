import { Text, View } from 'react-native'

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <Text className="text-center text-lg font-semibold text-slate-800">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-slate-500">{description}</Text>
      ) : null}
    </View>
  )
}
