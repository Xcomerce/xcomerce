import { useEffect, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@keve/shared'
import { ImagePlus } from 'lucide-react-native'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { QuotaBadge } from '@/components/common/QuotaBadge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useCategories, type Category } from '@/hooks/use-categories'
import { useBrazilianCities } from '@/hooks/use-brazilian-cities'
import { useSubscription } from '@/hooks/use-billing'
import {
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useProductCount,
  useUpdateProduct,
  useUpdateProductImage,
} from '@/hooks/use-products'
import { BRAZILIAN_STATES } from '@/lib/brazil-locations'
import { formatSupabaseError } from '@/lib/errors'
import { cn, formatCurrency } from '@/lib/utils'
import { getProductImageUri } from '@/lib/product-images'

type ProductFormProps = {
  productId?: string
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = Boolean(productId)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageExt, setImageExt] = useState('jpg')

  const { data: product, isLoading: productLoading } = useProduct(isEdit ? productId : undefined)
  const { data: categoriesData } = useCategories()
  const categories: Category[] = categoriesData ?? []
  const { data: count = 0 } = useProductCount()
  const { data: subscription } = useSubscription()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const uploadImage = useUpdateProductImage()

  const limit = subscription?.plan?.max_catalog_items ?? null
  const atLimit = !isEdit && limit !== null && count >= limit

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: '',
      category_id: '',
      sku: '',
      descricao: '',
      marca: '',
      cidade: '',
      uf: '',
      is_active: true,
    },
  })

  const watchedUf = watch('uf')
  const { data: cities = [], isLoading: citiesLoading } = useBrazilianCities(watchedUf)

  useEffect(() => {
    if (product) {
      reset({
        nome: product.nome,
        category_id: product.category_id,
        sku: product.sku ?? '',
        descricao: product.descricao ?? '',
        marca: product.marca ?? '',
        preco_referencia: product.preco_referencia ?? undefined,
        cidade: product.cidade,
        uf: product.uf,
        is_active: product.is_active,
      })
      setImageUri(getProductImageUri(product.nome, product.image_url))
    }
  }, [product, reset])

  useEffect(() => {
    if (!isEdit && atLimit) {
      Alert.alert(
        'Limite do catálogo',
        'Você atingiu o limite de produtos do seu plano. Faça upgrade para cadastrar mais itens.',
        [
          { text: 'Ver planos', onPress: () => router.push('/(app)/billing') },
          { text: 'Voltar', onPress: () => router.back() },
        ],
      )
    }
  }, [isEdit, atLimit, router])

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setImageUri(asset.uri)
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
    setImageExt(ext === 'png' || ext === 'webp' ? ext : 'jpg')
  }

  async function onSubmit(values: ProductInput) {
    if (!isEdit && atLimit) {
      Alert.alert('Limite do catálogo', 'Faça upgrade do plano para cadastrar mais produtos.')
      return
    }

    try {
      if (isEdit && productId) {
        await updateProduct.mutateAsync({ id: productId, input: values })
        if (imageUri && !imageUri.startsWith('http')) {
          await uploadImage.mutateAsync({ productId, uri: imageUri, ext: imageExt })
        }
        Alert.alert('Sucesso', 'Produto atualizado')
      } else {
        const created = await createProduct.mutateAsync(values)
        if (imageUri) {
          await uploadImage.mutateAsync({ productId: created.id, uri: imageUri, ext: imageExt })
        }
        Alert.alert('Sucesso', 'Produto criado')
      }
      router.replace('/(app)/catalog')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      if (msg.includes('QUOTA') || msg.includes('quota')) {
        Alert.alert('Limite do catálogo', 'Faça upgrade do plano para cadastrar mais produtos.')
      } else {
        Alert.alert('Erro', formatSupabaseError(err))
      }
    }
  }

  async function handleDelete() {
    if (!productId) return
    Alert.alert('Excluir produto', `Remover "${product?.nome ?? 'este produto'}" do catálogo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct.mutateAsync(productId)
            router.replace('/(app)/catalog')
          } catch (err) {
            Alert.alert('Erro', formatSupabaseError(err))
          }
        },
      },
    ])
  }

  const isSaving =
    createProduct.isPending || updateProduct.isPending || uploadImage.isPending || deleteProduct.isPending

  if (isEdit && productLoading) {
    return <LoadingSkeleton />
  }

  if (isEdit && !productLoading && !product) {
    return (
      <View className="items-center py-12">
        <Text className="text-slate-500">Produto não encontrado.</Text>
        <Button label="Voltar ao catálogo" className="mt-4" onPress={() => router.back()} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerClassName="gap-4 p-4 pb-28">
      {!isEdit ? (
        <View className="items-end">
          <QuotaBadge used={count} limit={limit} label="Catálogo" />
        </View>
      ) : null}

      <Card>
        <Text className="mb-3 text-base font-semibold text-slate-900">Imagem</Text>
        <Pressable onPress={pickImage} className="items-center gap-2">
          <View className="aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <ImagePlus size={48} color="#94a3b8" />
            )}
          </View>
          <Text className="text-sm font-medium text-brand">Selecionar imagem</Text>
        </Pressable>
        <Text className="mt-2 text-center text-xs text-slate-500">
          JPEG, PNG ou WebP · até 5 MB · recomendado 800×800 px
        </Text>
      </Card>

      <Card className="gap-4">
        <Controller
          control={control}
          name="nome"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Nome *" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.nome?.message} />
          )}
        />

        <View>
          <Text className="mb-1.5 text-sm font-medium text-slate-700">Categoria *</Text>
          <Controller
            control={control}
            name="category_id"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => onChange(cat.id)}
                    className={cn(
                      'rounded-full border px-3 py-2',
                      value === cat.id ? 'border-brand bg-brand/10' : 'border-slate-200 bg-white',
                    )}
                  >
                    <Text className={cn('text-sm', value === cat.id ? 'font-semibold text-brand' : 'text-slate-700')}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          />
          {errors.category_id ? <Text className="mt-1 text-xs text-red-500">{errors.category_id.message}</Text> : null}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="marca"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Marca" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="sku"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="SKU" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="descricao"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Descrição</Text>
              <TextInput
                className="min-h-[80px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                multiline
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor="#94a3b8"
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="preco_referencia"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Preço referência (R$)"
              value={value != null ? String(value) : ''}
              onChangeText={(v) => onChange(v ? Number(v.replace(',', '.')) : undefined)}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />

        <View>
          <Text className="mb-1.5 text-sm font-medium text-slate-700">UF *</Text>
          <Controller
            control={control}
            name="uf"
            render={({ field: { onChange, value } }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {BRAZILIAN_STATES.map((state) => (
                  <Pressable
                    key={state.uf}
                    onPress={() => {
                      onChange(state.uf)
                      setValue('cidade', '')
                    }}
                    className={cn(
                      'rounded-full border px-3 py-2',
                      value === state.uf ? 'border-brand bg-brand/10' : 'border-slate-200',
                    )}
                  >
                    <Text className={cn('text-sm font-medium', value === state.uf ? 'text-brand' : 'text-slate-700')}>
                      {state.uf}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          />
          {errors.uf ? <Text className="mt-1 text-xs text-red-500">{errors.uf.message}</Text> : null}
        </View>

        <View>
          <Text className="mb-1.5 text-sm font-medium text-slate-700">Cidade *</Text>
          {!watchedUf ? (
            <Text className="text-sm text-slate-500">Selecione o estado primeiro</Text>
          ) : citiesLoading ? (
            <Text className="text-sm text-slate-500">Carregando cidades...</Text>
          ) : (
            <Controller
              control={control}
              name="cidade"
              render={({ field: { onChange, value } }) => (
                <ScrollView style={{ maxHeight: 160 }} contentContainerClassName="gap-2">
                  {cities.map((city: string) => (
                    <Pressable
                      key={city}
                      onPress={() => onChange(city)}
                      className={cn(
                        'rounded-lg border px-3 py-2',
                        value === city ? 'border-brand bg-brand/5' : 'border-slate-200',
                      )}
                    >
                      <Text className={cn('text-sm', value === city ? 'font-semibold text-brand' : 'text-slate-700')}>
                        {city}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            />
          )}
          {errors.cidade ? <Text className="mt-1 text-xs text-red-500">{errors.cidade.message}</Text> : null}
        </View>
      </Card>

      <Button label={isSaving ? 'Salvando...' : 'Salvar produto'} onPress={handleSubmit(onSubmit)} loading={isSaving} />
      {isEdit ? (
        <Button label="Excluir produto" variant="destructive" onPress={handleDelete} loading={deleteProduct.isPending} />
      ) : (
        <Button label="Cancelar" variant="outline" onPress={() => router.back()} />
      )}
    </ScrollView>
  )
}
