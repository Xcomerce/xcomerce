import { SafeAreaView } from 'react-native-safe-area-context'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { ProductForm } from '@/components/catalog/ProductForm'

export default function NewProductScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Novo produto" />
      <BackButton className="mx-4 mb-2" fallbackHref="/(app)/catalog" />
      <ProductForm />
    </SafeAreaView>
  )
}
