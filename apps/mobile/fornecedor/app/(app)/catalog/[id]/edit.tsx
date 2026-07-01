import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { ProductForm } from '@/components/catalog/ProductForm'

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Editar produto" />
      <BackButton className="mx-4 mb-2" fallbackHref="/(app)/catalog" />
      <ProductForm productId={id} />
    </SafeAreaView>
  )
}
