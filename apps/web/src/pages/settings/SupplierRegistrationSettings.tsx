import { Link } from 'react-router-dom'
import { Calendar, ChevronRight, ClipboardList } from 'lucide-react'
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from '@keve/shared'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { SupplierStoreNameField } from '@/components/supplier/SupplierStoreNameField'
import { useOnboardingState } from '@/hooks/use-onboarding'
import { computeOnboardingStep } from '@/services/onboarding'
import { cn } from '@/lib/utils'

type Props = {
  supplierStatus: SupplierStatus | null | undefined
  joinDate: string
  className?: string
}

export function SupplierRegistrationSettings({ supplierStatus, joinDate, className }: Props) {
  const { data: onboarding, isLoading } = useOnboardingState()

  if (isLoading) {
    return <LoadingSkeleton className="h-40 w-full rounded-xl" />
  }

  const step = onboarding ? computeOnboardingStep(onboarding) : 1
  const statusLabel = supplierStatus ? SUPPLIER_STATUS_LABELS[supplierStatus] : '—'
  const isApproved = supplierStatus === 'aprovado'
  const isInReview = supplierStatus === 'em_revisao'
  const needsCompletion = !isApproved && !isInReview && step < 5

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Membro desde</span>
          </div>
          <p className="mt-2 text-sm font-medium capitalize">{joinDate}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status do cadastro</p>
          <Badge variant="secondary" className="mt-2">
            {statusLabel}
          </Badge>
        </div>
      </div>

      {onboarding?.company?.razao_social ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empresa</p>
            <p className="text-sm font-semibold">{onboarding.company.razao_social}</p>
            {onboarding.company.cnpj ? (
              <p className="text-sm text-muted-foreground">CNPJ {onboarding.company.cnpj}</p>
            ) : null}
            {onboarding.profile?.service_city ? (
              <p className="text-sm text-muted-foreground">
                Área: {onboarding.profile.service_city}/{onboarding.profile.service_uf} ·{' '}
                {onboarding.profile.service_radius_km} km
              </p>
            ) : null}
          </div>
          {onboarding.profile ? <SupplierStoreNameField /> : null}
        </div>
      ) : null}

      {needsCompletion ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Complete os dados da empresa para enviar seu cadastro para análise e liberar oportunidades na plataforma.
        </Alert>
      ) : null}

      {isInReview ? (
        <Alert>
          Seu cadastro foi enviado e está em análise. Você será notificado quando for aprovado.
        </Alert>
      ) : null}

      {!isApproved ? (
        <Button asChild className="w-full sm:w-auto">
          <Link to="/supplier/onboarding">
            <ClipboardList className="mr-2 h-4 w-4" />
            {needsCompletion ? 'Completar cadastro' : 'Revisar cadastro'}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Seu cadastro está aprovado. Para atualizar dados da empresa, entre em contato com o suporte.
        </p>
      )}
    </div>
  )
}
