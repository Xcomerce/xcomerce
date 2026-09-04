import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CarouselArrowProps = {
  side: 'left' | 'right'
  visible: boolean
  onClick: () => void
  ariaLabel: string
  className?: string
}

export function CarouselArrow({ side, visible, onClick, ariaLabel, className }: CarouselArrowProps) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'carousel-arrow absolute z-10 hidden -translate-y-1/2 md:flex',
        side === 'left' ? '-left-[21px]' : '-right-[21px]',
        !visible && '!hidden',
        className,
      )}
      aria-label={ariaLabel}
    >
      <Icon size={20} />
    </button>
  )
}
