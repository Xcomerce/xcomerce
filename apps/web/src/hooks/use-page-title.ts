import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resolvePageTitle } from '@/config/routes'

export function usePageTitle(): string {
  const { pathname } = useLocation()
  const title = resolvePageTitle(pathname)

  useEffect(() => {
    if (title === 'XCOMERCE') {
      document.title = 'XCOMERCE'
    } else {
      document.title = `XCOMERCE | ${title}`
    }
  }, [title])

  return title
}
