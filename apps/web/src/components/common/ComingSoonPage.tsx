import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { getDashboardForRole } from '@keve/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

type ComingSoonPageProps = {
  title: string
  description: string
  module?: string
}

export function ComingSoonPage({ title, description, module }: ComingSoonPageProps) {
  const { activeRole, roles } = useAuth()
  const role = activeRole ?? roles[0]
  const dashboard = role ? getDashboardForRole(role) : '/'

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Construction size={28} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <CardTitle className="font-display">{title}</CardTitle>
          <Badge className="border-accent/30 bg-accent/10 text-accent">
            Em breve
          </Badge>
        </div>
        {module && <CardDescription>Módulo {module}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="outline">
          <Link to={dashboard}>Voltar ao início</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function comingSoon(
  title: string,
  description: string,
  module?: string
): ComingSoonPageProps {
  return { title, description, module }
}
