import { Link, Outlet } from 'react-router-dom'
import { usePageTitle } from '@/hooks/use-page-title'
import { AuthHeroPanel } from '@/components/layout/AuthHeroPanel'

export function AuthLayout() {
  usePageTitle()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHeroPanel />
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Link to="/" className="flex items-center">
            <img src="/logo-dark.svg" className="h-12 object-contain dark:hidden" alt="X COMERCE" />
            <img src="/logo-clara.svg" className="h-12 object-contain hidden dark:block" alt="X COMERCE" />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
