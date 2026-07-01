import { View, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={cn('rounded-2xl border border-slate-200 bg-white p-4', className)} {...props}>
      {children}
    </View>
  )
}
