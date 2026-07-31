import { ScrollView, Text, View } from 'react-native'
import { cn } from '@/lib/utils'

export type StatItem = {
  label: string
  value: number | string
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'muted'
}

const toneStyles = {
  default: { box: 'bg-white border-slate-200', value: 'text-slate-900', label: 'text-slate-500' },
  brand: { box: 'bg-brand/5 border-brand/20', value: 'text-brand', label: 'text-brand/70' },
  success: { box: 'bg-emerald-50 border-emerald-200', value: 'text-emerald-700', label: 'text-emerald-600' },
  warning: { box: 'bg-amber-50 border-amber-200', value: 'text-amber-800', label: 'text-amber-700' },
  muted: { box: 'bg-slate-50 border-slate-200', value: 'text-slate-600', label: 'text-slate-500' },
} as const

export function StatsBar({ items }: { items: StatItem[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
      className="border-b border-slate-200 bg-slate-50"
    >
      {items.map((item) => {
        const tone = toneStyles[item.tone ?? 'default']
        return (
          <View key={item.label} className={cn('min-w-[88px] rounded-xl border px-3 py-2.5', tone.box)}>
            <Text className={cn('text-lg font-bold', tone.value)}>{item.value}</Text>
            <Text className={cn('mt-0.5 text-[11px] font-medium', tone.label)}>{item.label}</Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
