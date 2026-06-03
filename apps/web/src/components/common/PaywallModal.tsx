import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  quotaType?: 'demands' | 'offers' | 'catalog'
}

const MESSAGES = {
  demands: 'Você atingiu o limite mensal de demandas do seu plano.',
  offers: 'Você atingiu o limite mensal de propostas do seu plano.',
  catalog: 'Você atingiu o limite de itens no catálogo do seu plano.',
}

export function PaywallModal({ open, onClose, title, description, quotaType = 'demands' }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{title ?? 'Limite do plano atingido'}</CardTitle>
          <CardDescription>{description ?? MESSAGES[quotaType]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link to="/settings/billing">Ver planos e fazer upgrade</Link>
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
