import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supplierStoreNameSchema, getSupplierStoreNamePlaceholder } from '@keve/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOnboardingState, useUpdateSupplierStoreName } from '@/hooks/use-onboarding'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

type SupplierStoreNameFieldProps = {
  className?: string
  id?: string
}

export function SupplierStoreNameField({ className, id = 'store_name' }: SupplierStoreNameFieldProps) {
  const { data: onboarding } = useOnboardingState()
  const updateStoreName = useUpdateSupplierStoreName()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!onboarding?.profile || initialized) return
    setValue(onboarding.profile.store_name ?? onboarding.company?.nome_fantasia ?? '')
    setInitialized(true)
  }, [onboarding, initialized])

  async function handleBlur() {
    const parsed = supplierStoreNameSchema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Nome inválido')
      return
    }

    setError(null)
    const nextValue = parsed.data
    const currentValue = onboarding?.profile?.store_name?.trim() || null
    if (nextValue === currentValue) return

    try {
      await updateStoreName.mutateAsync(nextValue)
      toast.success('Nome da loja atualizado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  const placeholder = getSupplierStoreNamePlaceholder({
    store_name: onboarding?.profile?.store_name,
    company: onboarding?.company,
  })

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>Nome da loja</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) setError(null)
        }}
        onBlur={() => void handleBlur()}
        placeholder={placeholder}
        disabled={updateStoreName.isPending}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nome exibido para compradores no Explorar e no catálogo.
        </p>
      )}
    </div>
  )
}
