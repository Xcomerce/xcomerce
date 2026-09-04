import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useMobileKeyboardOffset } from '@/hooks/use-mobile-keyboard-offset'

/** Preenche o main do AppShell (já descontado o header) */
export const SCROLL_PAGE_HEIGHT_CLASS = 'h-full max-h-full min-h-0'

/** Coluna principal com scroll — mesmo padrão de Solicitar oferta */
export const SCROLL_PAGE_SECTION_CLASS =
  'scrollbar-custom min-h-0 flex-1 p-4 max-lg:flex-none max-lg:pb-8 lg:overflow-y-auto lg:p-6'

type ScrollPageShellProps = {
  children: ReactNode
  className?: string
  mobileFooter?: ReactNode
}

export function ScrollPageShell({ children, className, mobileFooter }: ScrollPageShellProps) {
  const keyboardOffset = useMobileKeyboardOffset(Boolean(mobileFooter))

  return (
    <div
      className={cn(
        SCROLL_PAGE_HEIGHT_CLASS,
        'flex w-full flex-col overflow-hidden lg:flex-row',
        className,
      )}
    >
      <div
        className="scrollbar-custom flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:contents"
        style={
          mobileFooter && keyboardOffset > 0
            ? { paddingBottom: keyboardOffset + 12 }
            : undefined
        }
      >
        {children}
      </div>
      {mobileFooter ? (
        <div
          className="shrink-0 lg:contents"
          style={
            keyboardOffset > 0
              ? { transform: `translateY(-${keyboardOffset}px)` }
              : undefined
          }
        >
          {mobileFooter}
        </div>
      ) : null}
    </div>
  )
}
