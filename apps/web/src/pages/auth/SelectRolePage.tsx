import { useNavigate } from 'react-router-dom'
import { Building2, Shield, ShoppingBag } from 'lucide-react'
import { getDashboardForRole, type UserRole } from '@keve/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { ROLE_LABELS } from '@/config/navigation'
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<UserRole, typeof ShoppingBag> = {
  buyer: ShoppingBag,
  supplier: Building2,
  admin: Shield,
  commercial: Shield,
}

export function SelectRolePage() {
  const navigate = useNavigate()
  const { roles, setActiveRole } = useAuth()

  function handleSelect(role: UserRole) {
    setActiveRole(role)
    navigate(getDashboardForRole(role))
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Escolha como deseja continuar
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Sua conta possui acesso a múltiplos perfis
          </p>
        </div>

        <div className={cn(
          "grid gap-6 w-full mx-auto justify-center",
          roles.length === 1 && "max-w-md grid-cols-1",
          roles.length === 2 && "max-w-3xl grid-cols-1 sm:grid-cols-2",
          roles.length === 3 && "max-w-4xl grid-cols-1 sm:grid-cols-3",
          roles.length >= 4 && "max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}>
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role]
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleSelect(role)}
                className="group text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none w-full h-full"
              >
                <Card className="h-full flex flex-col justify-between cursor-pointer border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md">
                  <CardHeader className="space-y-3 pb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon size={24} />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="font-display text-lg font-semibold leading-none">{ROLE_LABELS[role]}</CardTitle>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                      {role === 'buyer' && 'Publique demandas e gerencie propostas'}
                      {role === 'supplier' && 'Veja oportunidades e envie propostas'}
                      {role === 'admin' && 'Administre aprovações e métricas'}
                      {role === 'commercial' && 'Área comercial (em breve)'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="inline-flex items-center text-sm font-medium text-primary transition-colors">
                      Continuar <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
