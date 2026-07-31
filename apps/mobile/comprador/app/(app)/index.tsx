import { Package } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, Image, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppHeader } from '@/components/layout/AppHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { FeedSearchBar } from '@/components/feed/FeedSearchBar'
import { useCategories } from '@/hooks/use-categories'
import { useFeedProducts } from '@/hooks/use-products'
import { getProductImageUri } from '@/lib/product-images'
import { formatCurrency } from '@/lib/utils'
import type { Category } from '@/services/categories'
import type { FeedProduct } from '@/services/products'

function openNewDemandFromProduct(router: ReturnType<typeof useRouter>, product: FeedProduct) {
  router.push({
    pathname: '/(app)/request-offer',
    params: {
      returnTo: 'feed',
      categoryId: product.category_id,
      title: product.nome,
      description: product.descricao ?? '',
      city: product.cidade ?? '',
      uf: product.uf ?? '',
      precoReferencia:
        product.preco_referencia != null && product.preco_referencia > 0
          ? String(product.preco_referencia)
          : '',
    },
  })
}

export default function FeedScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedUf, setSelectedUf] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const { data: categories = [] } = useCategories()
  const { data: products = [], isLoading } = useFeedProducts({
    search: search || undefined,
    categoryId,
    uf: selectedUf || undefined,
  })

  const isFilteredView = Boolean(categoryId || search || selectedUf)

  const sections = useMemo(() => {
    if (isFilteredView) {
      let title = 'Resultados'
      if (search) title = `Resultados para "${search}"`
      else if (categoryId) {
        const category = categories.find((cat: Category) => cat.id === categoryId)
        title = category?.name ?? 'Categoria'
      } else if (selectedUf) {
        title = `Produtos em ${selectedUf}`
      }
      return [{ title, data: products }]
    }
    const grouped = new Map<string, FeedProduct[]>()
    for (const p of products) {
      const key = p.category?.name ?? 'Outros'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(p)
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }))
  }, [products, categoryId, search, selectedUf, isFilteredView, categories])

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Feed" />
      <View className="bg-white px-4 pb-3 pt-4">
        <FeedSearchBar
          search={search}
          onSearchChange={setSearch}
          selectedUf={selectedUf}
          onUfChange={setSelectedUf}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'Todos' }, ...categories]}
          keyExtractor={(item) => item.id}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = categoryId === item.id || (!categoryId && item.id === 'all')
            return (
              <Pressable
                onPress={() => setCategoryId(item.id === 'all' ? undefined : item.id)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-brand' : 'bg-white border border-slate-200'}`}
              >
                <Text className={active ? 'text-white font-semibold' : 'text-slate-600'}>{item.name}</Text>
              </Pressable>
            )
          }}
        />
      </View>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : products.length === 0 ? (
        <EmptyState title="Nenhum produto no feed" description="Publique uma demanda para receber propostas dos fornecedores." />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.title}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item: section }) => (
            <View>
              <Text className="mb-3 text-lg font-bold text-brand-dark">{section.title}</Text>
              <View className="flex-row flex-wrap gap-3">
                {section.data.map((product: FeedProduct) => {
                  const imageUri = getProductImageUri(product.nome, product.image_url)
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => openNewDemandFromProduct(router, product)}
                      className="w-[47%] overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} className="h-32 w-full" resizeMode="cover" />
                      ) : (
                        <View className="h-32 items-center justify-center bg-slate-100">
                          <Package size={40} color="#94a3b8" />
                        </View>
                      )}
                      <View className="p-3">
                        <Text className="font-semibold text-slate-800" numberOfLines={2}>
                          {product.nome}
                        </Text>
                        <Text className="mt-1 text-sm font-bold text-brand">{formatCurrency(product.preco_referencia)}</Text>
                        <Text className="mt-1 text-xs text-slate-500">
                          {product.cidade}/{product.uf}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}
