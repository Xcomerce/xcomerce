import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-dark p-10 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">K</div>
          <span className="font-display text-xl font-semibold">Keven B2b</span>
        </Link>
        <div>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Busca reversa B2B para compradores e fornecedores
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Publique demandas, receba propostas qualificadas e negocie com fornecedores verificados na sua região.
          </p>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Keven B2b</p>
      </div>
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-dark text-sm font-bold text-white">
              K
            </div>
            <span className="font-display text-lg font-semibold">Keven B2b</span>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
