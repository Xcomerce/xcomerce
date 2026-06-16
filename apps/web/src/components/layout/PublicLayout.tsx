import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/hooks/use-page-title'

export function PublicLayout() {
  usePageTitle()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-navbar sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon-dark.svg" className="h-6 w-auto object-contain dark:hidden" alt="" />
            <img src="/logo-icon-light.svg" className="h-6 w-auto object-contain hidden dark:block" alt="" />
            <span className="font-display text-lg font-medium tracking-wider text-brand-dark dark:text-foreground">
              XCOMERCE
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link to="/para-compradores" className="text-muted-foreground hover:text-foreground">
              Compradores
            </Link>
            <Link to="/para-fornecedores" className="text-muted-foreground hover:text-foreground">
              Fornecedores
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
              Planos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth/login">Entrar</Link>
            </Button>
            <Button variant="accent" asChild className="hidden sm:inline-flex">
              <Link to="/auth/register/buyer">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground lg:px-6">
          © {new Date().getFullYear()} XCOMERCE · Termos · Privacidade
        </div>
      </footer>
    </div>
  )
}
