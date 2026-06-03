import { useLocation } from 'react-router-dom'
import { resolvePageTitle } from '@/config/routes'

export function usePageTitle(): string {
  const { pathname } = useLocation()
  return resolvePageTitle(pathname)
}
