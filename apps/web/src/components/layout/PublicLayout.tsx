import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSeo } from '@/hooks/use-seo'

export function PublicLayout() {
  useSeo()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-navbar sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="XCOMERCE — página inicial">
            <img src="/logo-icon-dark.svg" className="h-6 w-auto object-contain dark:hidden" alt="" />
            <img src="/logo-icon-light.svg" className="hidden h-6 w-auto object-contain dark:block" alt="" />
            <span className="font-display text-lg font-medium tracking-wider text-brand-dark dark:text-foreground">
              XCOMERCE
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Navegação principal">
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
      <footer className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo-icon-dark.svg" className="h-6 w-auto object-contain dark:hidden" alt="" />
                <img src="/logo-icon-light.svg" className="hidden h-6 w-auto object-contain dark:block" alt="" />
                <span className="font-display text-lg font-medium tracking-wider">XCOMERCE</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                Marketplace B2B de busca reversa. Conecte compradores a fornecedores verificados por categoria e
                localização.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Produto</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/para-compradores" className="hover:text-foreground">
                    Para compradores
                  </Link>
                </li>
                <li>
                  <Link to="/para-fornecedores" className="hover:text-foreground">
                    Para fornecedores
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-foreground">
                    Planos e preços
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">Conta</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/auth/login" className="hover:text-foreground">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link to="/auth/register/buyer" className="hover:text-foreground">
                    Cadastro comprador
                  </Link>
                </li>
                <li>
                  <Link to="/auth/register/supplier" className="hover:text-foreground">
                    Cadastro fornecedor
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} XCOMERCE. Todos os direitos reservados.</p>
            <p>Termos · Privacidade · LGPD</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
