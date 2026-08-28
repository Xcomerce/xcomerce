import { Map, MapPin, Phone, Star } from 'lucide-react'
import { buildGoogleMapsDirectionsUrl, toTelHref } from '@/lib/address'
import { cn, formatPhone } from '@/lib/utils'

type OrderSupplierPickupInfoProps = {
  displayName: string
  avgRating: number
  totalRatings: number
  address: string | null
  phone: string | null
  className?: string
}

export function OrderSupplierPickupInfo({
  displayName,
  avgRating,
  totalRatings,
  address,
  phone,
  className,
}: OrderSupplierPickupInfoProps) {
  const telHref = toTelHref(phone)
  const mapsUrl = address ? buildGoogleMapsDirectionsUrl(address) : null

  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/20 px-4 py-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Retirar em
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-foreground">{displayName}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
          <span>({totalRatings})</span>
        </div>
      </div>

      {address ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{address}</span>
        </p>
      ) : null}

      {phone && telHref ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm">
          <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <a
            href={telHref}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {formatPhone(phone)}
          </a>
        </p>
      ) : null}

      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <Map className="h-3.5 w-3.5" />
          Como chegar
        </a>
      ) : null}
    </div>
  )
}
