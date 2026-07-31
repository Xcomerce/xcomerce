import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { cn } from '@/lib/utils'

export function DetailField({
  label,
  value,
  className,
  valueClassName,
  fullWidth,
}: {
  label: string
  value: string
  className?: string
  valueClassName?: string
  fullWidth?: boolean
}) {
  return (
    <View className={cn(fullWidth ? 'w-full' : 'min-w-0 flex-1 basis-[45%]', className)}>
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className={cn('mt-0.5 text-sm font-medium text-slate-900', valueClassName)}>{value}</Text>
    </View>
  )
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('flex-row flex-wrap gap-y-3', className)}>{children}</View>
}

export function SectionCard({
  title,
  children,
  action,
  className,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <View className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text className="text-base font-semibold text-slate-900">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}
