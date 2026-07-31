import { TextInput, View, Text, type TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

type InputProps = TextInputProps & {
  label?: string
  error?: string
  containerClassName?: string
}

export function Input({ label, error, containerClassName, className, ...props }: InputProps) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text className="text-sm font-medium text-slate-700">{label}</Text> : null}
      <TextInput
        className={cn(
          'h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900',
          error && 'border-red-500',
          className,
        )}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  )
}
