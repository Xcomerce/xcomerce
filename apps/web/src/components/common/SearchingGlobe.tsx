import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

type SearchingGlobeProps = {
  /** Pulso de radar (busca ativa) */
  active?: boolean
  /** Rotação do globo — padrão ligada; use false para pausar */
  spin?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function SearchingGlobe({
  active = true,
  spin = true,
  size = 'md',
  className,
}: SearchingGlobeProps) {
  const box = size === 'sm' ? 'h-24 w-24' : 'h-28 w-28'
  const icon = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'

  return (
    <div className={cn('relative mx-auto flex items-center justify-center', box, className)}>
      <span
        className={cn(
          'absolute inset-0 rounded-full border border-primary/15',
          active && 'animate-[supplier-radar_2.4s_ease-out_infinite]',
        )}
      />
      <span
        className={cn(
          'absolute inset-2 rounded-full border border-primary/25',
          active && 'animate-[supplier-radar_2.4s_ease-out_infinite_0.6s]',
        )}
      />
      <svg
        className={cn(
          'absolute inset-0 h-full w-full text-primary/30',
          spin && 'animate-[spin_12s_linear_infinite]',
        )}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <ellipse cx="50" cy="50" rx="42" ry="42" stroke="currentColor" strokeWidth="0.75" />
        <ellipse cx="50" cy="50" rx="42" ry="14" stroke="currentColor" strokeWidth="0.75" />
        <ellipse cx="50" cy="50" rx="14" ry="42" stroke="currentColor" strokeWidth="0.75" />
        <line x1="8" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="0.75" />
        <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <Globe
        className={cn('relative z-10 text-primary/80', icon, spin && 'animate-[spin_20s_linear_infinite]')}
        strokeWidth={1}
        aria-hidden
      />
    </div>
  )
}
