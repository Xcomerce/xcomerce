import { formatDemandVariantSummary, type DemandVariantFields } from '@keve/shared'
import { cn } from '@/lib/utils'

type DemandVariantSummaryProps = {
  demand: DemandVariantFields
  className?: string
  inline?: boolean
}

export function DemandVariantSummary({ demand, className, inline }: DemandVariantSummaryProps) {
  const summary = formatDemandVariantSummary(demand)
  if (!summary) return null

  if (inline) {
    return <span className={cn('text-muted-foreground', className)}>{summary}</span>
  }

  return <p className={cn('text-sm text-muted-foreground', className)}>{summary}</p>
}
