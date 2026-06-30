import { toast } from 'sonner'
import { BuyerAddressForm } from '@/components/buyer/BuyerAddressForm'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useBuyerAddress, useUpdateBuyerAddress } from '@/hooks/use-buyer-address'
import { translateSupabaseError } from '@/lib/errors'
import type { BuyerAddressInput } from '@keve/shared'

export function BuyerDeliveryAddressSettings() {
  const { data: address, isLoading, error } = useBuyerAddress()
  const updateAddress = useUpdateBuyerAddress()

  async function handleSave(input: BuyerAddressInput) {
    try {
      await updateAddress.mutateAsync(input)
      toast.success('Endereço de entrega salvo')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar endereço'))
      throw err
    }
  }

  if (isLoading) {
    return <LoadingSkeleton className="h-48 w-full rounded-xl" />
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar seu endereço de entrega. Tente recarregar a página.
      </p>
    )
  }

  return (
    <div className="min-w-0 border-t border-border/50 pt-6">
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Endereço de entrega</h3>
        <p className="text-xs text-muted-foreground">
          Endereço padrão usado ao solicitar ofertas. Você poderá alterá-lo a cada demanda, se necessário.
        </p>
      </div>
      <BuyerAddressForm
        idPrefix="profile-address"
        value={address ?? undefined}
        readOnly={false}
        saving={updateAddress.isPending}
        onSave={handleSave}
      />
    </div>
  )
}
