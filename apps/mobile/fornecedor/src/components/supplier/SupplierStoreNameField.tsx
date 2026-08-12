import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import {
  getSupplierStoreNamePlaceholder,
  supplierStoreNameSchema,
} from '@keve/shared'
import { Input } from '@/components/ui/Input'
import { useOnboardingState, useUpdateSupplierStoreName } from '@/hooks/use-onboarding'
import { formatSupabaseError } from '@/lib/errors'

export function SupplierStoreNameField() {
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
    } catch (err) {
      Alert.alert('Nome da loja', formatSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  const placeholder = getSupplierStoreNamePlaceholder({
    store_name: onboarding?.profile?.store_name,
    company: onboarding?.company,
  })

  return (
    <View>
      <Input
        label="Nome da loja"
        value={value}
        onChangeText={(text) => {
          setValue(text)
          if (error) setError(null)
        }}
        onBlur={() => void handleBlur()}
        placeholder={placeholder}
        editable={!updateStoreName.isPending}
        error={error ?? undefined}
      />
      {!error ? (
        <Text className="mt-1 text-xs text-slate-500">
          Nome exibido para compradores no Explorar e no catálogo.
        </Text>
      ) : null}
    </View>
  )
}
