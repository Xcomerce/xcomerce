import { Link, Outlet } from 'react-router-dom'
import { usePageTitle } from '@/hooks/use-page-title'

export function AuthLayout() {
  usePageTitle()
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-dark p-10 text-white lg:flex">
        <Link to="/" className="flex items-center">
          <img src="/logo-clara.svg" className="h-14 object-contain" alt="X COMERCE" />
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Busca reversa B2B para compradores e fornecedores
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Publique demandas, receba propostas qualificadas e negocie com fornecedores verificados na sua região.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} X COMERCE</p>
      </div>
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
