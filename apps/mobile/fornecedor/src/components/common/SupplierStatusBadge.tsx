import { Text, View } from 'react-native'
import type { SupplierStatus } from '@keve/shared'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<
  SupplierStatus,
  { label: string; className: string }
> = {
  pendente: { label: 'Cadastro pendente', className: 'bg-slate-100 text-slate-700' },
  em_revisao: { label: 'Em revisão', className: 'bg-amber-100 text-amber-800' },
  aprovado: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-800' },
  recusado: { label: 'Recusado', className: 'bg-red-100 text-red-800' },
}

export function SupplierStatusBadge({ status }: { status: SupplierStatus | null | undefined }) {
  if (!status) return null
  const config = STATUS_CONFIG[status]
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', config.className)}>
      <Text className="text-xs font-semibold">{config.label}</Text>
    </View>
  )
}
