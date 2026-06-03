import { Badge } from '@/components/ui/badge'

type Props = {
  used: number
  limit: number | null
  label: string
}

export function QuotaBadge({ used, limit, label }: Props) {
  if (limit === null) {
    return (
      <Badge className="bg-secondary text-secondary-foreground">
        {label}: {used} (ilimitado)
      </Badge>
    )
  }

  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0
  const exhausted = used >= limit
  const cls = exhausted
    ? 'bg-destructive text-destructive-foreground'
    : pct >= 80
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary text-secondary-foreground'

  return (
    <Badge className={cls}>
      {label}: {used}/{limit}
    </Badge>
  )
}
