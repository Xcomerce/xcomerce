import { useMemo, useState } from 'react'
import { Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Package, Plus } from 'lucide-react-native'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { useAuth } from '@/contexts/auth-context'
import { useProducts, useProductCount } from '@/hooks/use-products'
import { useSubscription } from '@/hooks/use-billing'
import { useCategories, type Category } from '@/hooks/use-categories'
import type { Product } from '@/services/products'
import { cn, formatCurrency } from '@/lib/utils'
import { getProductImageUri } from '@/lib/product-images'

function ProductCard({
  product,
  categoryName,
  onPress,
}: {
  product: Product
  categoryName?: string
  onPress: () => void
}) {
  const imageUri = getProductImageUri(product.nome, product.image_url)
  const location =
    product.cidade && product.uf ? `${product.cidade}/${product.uf}` : product.uf ?? null

  return (
    <Pressable className="flex-1" onPress={onPress}>
      <Card className="overflow-hidden p-0">
        <View className="relative aspect-square bg-slate-100">
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Package size={28} color="#cbd5e1" />
            </View>
          )}
          {product.sku ? (
            <View className="absolute bottom-2 left-2 max-w-[85%] rounded-md bg-white/90 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-600" numberOfLines={1}>
                {product.sku}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="gap-1 p-3">
          <Text className="font-semibold text-slate-900" numberOfLines={2}>
            {product.nome}
          </Text>
          {product.marca ? (
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {product.marca}
            </Text>
          ) : null}
          {categoryName ? (
            <View className="self-start rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-slate-600" numberOfLines={1}>
                {categoryName}
              </Text>
            </View>
          ) : null}
          {location ? <Text className="text-[11px] text-slate-500">{location}</Text> : null}
          <Text className="text-sm font-bold text-brand-dark">{formatCurrency(product.preco_referencia)}</Text>
        </View>
      </Card>
    </Pressable>
  )
}

export default function CatalogScreen() {
  const router = useRouter()
  const { supplierStatus } = useAuth()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const { data: productsData, isLoading, refetch, isRefetching } = useProducts()
  const products: Product[] = productsData ?? []
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const { data: allCategoriesData } = useCategories()
  const allCategories: Category[] = allCategoriesData ?? []

  const limit = subscription?.plan?.max_catalog_items ?? null
  const atLimit = limit !== null && count >= limit

  const uniqueCategoryIds = useMemo(
    () => Array.from(new Set(products.map((p) => p.category_id))),
    [products],
  )

  const categories = useMemo(
    () => allCategories.filter((cat) => uniqueCategoryIds.includes(cat.id)),
    [allCategories, uniqueCategoryIds],
  )

  const categoryNamesById = useMemo(
    () => Object.fromEntries(allCategories.map((cat) => [cat.id, cat.name])),
    [allCategories],
  )

  const activeProducts = products.filter((p) => p.is_active)
  const filteredProducts = selectedCategoryId
    ? activeProducts.filter((p) => p.category_id === selectedCategoryId)
    : activeProducts

  function handleNewProduct() {
    if (atLimit) {
      Alert.alert(
        'Limite do catálogo',
        'Você atingiu o limite de produtos do seu plano.',
        [
          { text: 'Ver planos', onPress: () => router.push('/(app)/billing') },
          { text: 'Fechar', style: 'cancel' },
        ],
      )
      return
    }
    router.push('/(app)/catalog/new')
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader
        title="Catálogo"
        subtitle={
          activeProducts.length > 0
            ? `${activeProducts.length} produto${activeProducts.length === 1 ? '' : 's'} ativo${activeProducts.length === 1 ? '' : 's'}`
            : 'Cadastre produtos para reforçar suas propostas'
        }
        supplierStatus={supplierStatus}
      />
      <View className="gap-3 border-b border-slate-200 bg-white px-4 py-3">
        {categories.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Pressable
              onPress={() => setSelectedCategoryId(null)}
              className={cn(
                'rounded-full px-4 py-2',
                selectedCategoryId === null ? 'bg-brand' : 'border border-slate-200',
              )}
            >
              <Text className={cn('text-sm font-semibold', selectedCategoryId === null ? 'text-white' : 'text-slate-700')}>
                Todos ({activeProducts.length})
              </Text>
            </Pressable>
            {categories.map((cat) => {
              const catCount = activeProducts.filter((p) => p.category_id === cat.id).length
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    'rounded-full px-4 py-2',
                    selectedCategoryId === cat.id ? 'bg-brand' : 'border border-slate-200',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-semibold',
                      selectedCategoryId === cat.id ? 'text-white' : 'text-slate-700',
                    )}
                  >
                    {cat.name} ({catCount})
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}
        <View className="flex-row items-center justify-between gap-2">
          <QuotaBadge used={count} limit={limit} label="Itens" />
          <Pressable
            onPress={handleNewProduct}
            className="flex-row items-center gap-1 rounded-xl bg-brand px-4 py-2"
          >
            <Plus size={18} color="#fff" />
            <Text className="text-sm font-semibold text-white">Novo produto</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <LoadingSkeleton />
      ) : activeProducts.length === 0 ? (
        <View className="flex-1">
          <EmptyState
            title="Catálogo vazio"
            description="Cadastre produtos com imagem, preço de referência e localização para fortalecer suas propostas."
          />
          <View className="px-4">
            <Button label="Novo produto" onPress={handleNewProduct} />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          ListHeaderComponent={
            filteredProducts.length < activeProducts.length ? (
              <Text className="mb-1 text-xs text-slate-500">
                Exibindo {filteredProducts.length} de {activeProducts.length} produtos
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              categoryName={categoryNamesById[item.category_id]}
              onPress={() => router.push(`/(app)/catalog/${item.id}/edit`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  )
}
