import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { usePublicProfile } from '@/hooks/use-ratings'
import { getInitials } from '@/lib/utils'
import { SUPPLIER_STATUS_LABELS } from '@keve/shared'

export function PublicProfilePage() {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { data: profile, isLoading, isError } = usePublicProfile(userId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Perfil não encontrado.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" size="sm" className="inline-flex items-center gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-lg">{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              {profile.full_name}
              {profile.verified && (
                <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verificado" />
              )}
            </CardTitle>
            <p className="text-sm capitalize text-muted-foreground">
              {profile.role === 'supplier' ? 'Fornecedor' : profile.role === 'buyer' ? 'Comprador' : 'Usuário'}
            </p>
            {profile.role === 'supplier' && profile.supplier_status && (
              <StatusBadge status={profile.supplier_status} kind="supplier" className="mt-2" />
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="flex items-center justify-center gap-1 text-2xl font-bold">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {profile.avg_rating.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Média</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.total_ratings}</p>
            <p className="text-xs text-muted-foreground">Avaliações</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.orders_completed}</p>
            <p className="text-xs text-muted-foreground">Pedidos</p>
          </div>
        </CardContent>
      </Card>

      {profile.verified && (
        <Badge className="w-full justify-center border-0 bg-green-100 py-2 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Selo verificado — {SUPPLIER_STATUS_LABELS.aprovado}
        </Badge>
      )}
    </div>
  )
}
