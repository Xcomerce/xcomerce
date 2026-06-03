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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Escolha como deseja continuar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sua conta possui acesso a múltiplos perfis</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role]
          return (
            <button
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
              className="text-left transition-transform hover:scale-[1.02]"
            >
              <Card className={cn('h-full cursor-pointer hover:border-primary/50')}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={20} />
                  </div>
                  <CardTitle className="font-display text-lg">{ROLE_LABELS[role]}</CardTitle>
                  <CardDescription>
                    {role === 'buyer' && 'Publique demandas e gerencie propostas'}
                    {role === 'supplier' && 'Veja oportunidades e envie propostas'}
                    {role === 'admin' && 'Administre aprovações e métricas'}
                    {role === 'commercial' && 'Área comercial (em breve)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-primary">Continuar →</span>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
