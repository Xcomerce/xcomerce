import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Preenche o main do AppShell (já descontado o header) */
export const SCROLL_PAGE_HEIGHT_CLASS = 'h-full max-h-full min-h-0'

/** Coluna principal com scroll — mesmo padrão de Solicitar oferta */
export const SCROLL_PAGE_SECTION_CLASS =
  'scrollbar-custom min-h-0 flex-1 p-4 max-lg:flex-none lg:overflow-y-auto lg:p-6'

type ScrollPageShellProps = {
  children: ReactNode
  className?: string
  mobileFooter?: ReactNode
}

export function ScrollPageShell({ children, className, mobileFooter }: ScrollPageShellProps) {
  return (
    <div
      className={cn(
        SCROLL_PAGE_HEIGHT_CLASS,
        'flex w-full flex-col overflow-hidden lg:flex-row',
        className,
      )}
    >
      <div className="scrollbar-custom flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:contents">
        {children}
      </div>
      {mobileFooter}
    </div>
  )
}
