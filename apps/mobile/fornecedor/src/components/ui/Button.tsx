import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'
import { cn } from '@/lib/utils'

type ButtonProps = PressableProps & {
  label: string
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive'
  loading?: boolean
  className?: string
}

const variants = {
  primary: 'bg-brand',
  secondary: 'bg-brand-dark',
  outline: 'border border-brand bg-transparent',
  destructive: 'bg-red-600',
}

const textVariants = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-brand',
  destructive: 'text-white',
}

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        'h-12 items-center justify-center rounded-xl px-4',
        variants[variant],
        (disabled || loading) && 'opacity-50',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className={cn('text-base font-semibold', textVariants[variant])}>{label}</Text>
      )}
    </Pressable>
  )
}
