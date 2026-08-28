import { formatOrderEventDateTime, type OrderTimelineEvent } from '@/lib/order-display'

type OrderCardTimelineProps = {
  events: OrderTimelineEvent[]
}

export function OrderCardTimeline({ events }: OrderCardTimelineProps) {
  if (events.length === 0) return null

  return (
    <div className="space-y-0.5">
      {events.map((event) => (
        <p key={`${event.label}-${event.at}`} className="text-xs text-muted-foreground">
          {event.label} {formatOrderEventDateTime(event.at)}
        </p>
      ))}
    </div>
  )
}
