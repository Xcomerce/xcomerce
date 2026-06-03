import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DEMAND_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
} from '@keve/shared'

type StatusKind = 'demand' | 'offer' | 'order' | 'supplier'

const LABELS: Record<StatusKind, Record<string, string>> = {
  demand: DEMAND_STATUS_LABELS,
  offer: OFFER_STATUS_LABELS,
  order: ORDER_STATUS_LABELS,
  supplier: SUPPLIER_STATUS_LABELS,
}

const VARIANTS: Record<string, string> = {
  RASCUNHO: 'bg-muted text-muted-foreground',
  PUBLICADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  OFERTAS_RECEBIDAS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  EM_NEGOCIACAO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PROPOSTA_ACEITA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  EXPIRADO: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  enviada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  aceita: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejeitada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  expirada: 'bg-gray-100 text-gray-600',
  cancelada: 'bg-red-100 text-red-800',
  pendente: 'bg-amber-100 text-amber-800',
  em_revisao: 'bg-blue-100 text-blue-800',
  aprovado: 'bg-green-100 text-green-800',
  recusado: 'bg-red-100 text-red-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  ENTREGUE: 'bg-teal-100 text-teal-800',
}

type Props = {
  status: string
  kind: StatusKind
  className?: string
}

export function StatusBadge({ status, kind, className }: Props) {
  const label = LABELS[kind][status] ?? status
  const variant = VARIANTS[status] ?? 'bg-muted text-muted-foreground'

  return (
    <Badge className={cn('border-0 font-medium', variant, className)}>
      {label}
    </Badge>
  )
}
