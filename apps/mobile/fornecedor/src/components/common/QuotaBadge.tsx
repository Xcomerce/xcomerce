import { Text, View } from 'react-native'
import { cn } from '@/lib/utils'

type Props = {
  used: number
  limit: number | null
  label: string
}

export function QuotaBadge({ used, limit, label }: Props) {
  if (limit === null) {
    return (
      <View className="rounded-full bg-slate-100 px-3 py-1">
        <Text className="text-xs font-semibold text-slate-700">
          {label}: {used} (ilimitado)
        </Text>
      </View>
    )
  }

  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0
  const exhausted = used >= limit
  const cls = exhausted
    ? 'bg-red-100'
    : pct >= 80
      ? 'bg-brand/10'
      : 'bg-slate-100'
  const textCls = exhausted ? 'text-red-700' : pct >= 80 ? 'text-brand' : 'text-slate-700'

  return (
    <View className={cn('rounded-full px-3 py-1', cls)}>
      <Text className={cn('text-xs font-semibold', textCls)}>
        {label}: {used}/{limit}
      </Text>
    </View>
  )
}
