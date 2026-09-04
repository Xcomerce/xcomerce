import { useEffect, useState } from 'react'

/**
 * Estima quanto o teclado virtual ocupa na viewport (iOS/Android).
 * Retorna 0 em desktop ou quando o teclado está fechado.
 */
export function useMobileKeyboardOffset(enabled = true) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const viewport = window.visualViewport
    if (!viewport) return

    function update() {
      if (!viewport) return
      const next = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setOffset(Math.round(next))
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)

    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [enabled])

  return offset
}

export function scrollFocusedFieldIntoView(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return
  if (!target.matches('input, textarea, select, [contenteditable="true"]')) return

  window.setTimeout(() => {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 320)
}
