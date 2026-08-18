import { useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { Upload, X } from 'lucide-react-native'
import { BackButton } from '@/components/common/back-button'
import { EligibleSuppliersPanel } from '@/components/demand/EligibleSuppliersPanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getLeafCategories } from '@keve/shared'
import { useCategories } from '@/hooks/use-categories'
import { useCreateDemand, usePublishDemand } from '@/hooks/use-demands'
import { formatSupabaseError, isQuotaExceededError } from '@/lib/errors'
import { formatCurrency } from '@/lib/utils'
import type { Category } from '@/services/categories'

const MAX_ATTACHMENTS = 10
const DEFAULT_CITY = 'São Paulo'
const DEFAULT_UF = 'SP'
const DEFAULT_RADIUS_KM = 50

type PrefillParams = {
  categoryId?: string
  title?: string
  description?: string
  city?: string
  uf?: string
  precoReferencia?: string
  returnTo?: string
}

async function resolveDemandLocation(
  cityParam?: string,
  ufParam?: string,
): Promise<{ cidade: string; uf: string; raio_km: number }> {
  if (cityParam?.trim() && ufParam?.trim()) {
    return {
      cidade: cityParam.trim(),
      uf: ufParam.trim().toUpperCase(),
      raio_km: DEFAULT_RADIUS_KM,
    }
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({})
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
      const cidade = place?.city?.trim() || place?.subregion?.trim()
      const uf = place?.region?.slice(0, 2).toUpperCase()
      if (cidade && uf) {
        return { cidade, uf, raio_km: DEFAULT_RADIUS_KM }
      }
    }
  } catch {
    // fallback below
  }

  return {
    cidade: DEFAULT_CITY,
    uf: DEFAULT_UF,
    raio_km: DEFAULT_RADIUS_KM,
  }
}

export default function NewDemandScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<PrefillParams>()
  const { data: categories = [] } = useCategories()
  const leafCategories = useMemo(() => getLeafCategories(categories), [categories])
  const createDemand = useCreateDemand()
  const publishDemand = usePublishDemand()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [unidade, setUnidade] = useState('un')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [raioKm, setRaioKm] = useState(String(DEFAULT_RADIUS_KM))
  const [prazoDesejado, setPrazoDesejado] = useState('')
  const [precoReferencia, setPrecoReferencia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined
  const backFallback = returnTo === 'feed' ? '/(app)' : '/(app)/demands'
  const selectedCategory = leafCategories.find((cat: Category) => cat.id === categoryId)
  const descricaoPlaceholder = useMemo(() => {
    const names = leafCategories.slice(0, 5).map((cat: Category) => cat.name)
    if (names.length === 0) return 'Ex> ...'
    return `Ex> ${names.join(', ')}`
  }, [leafCategories])

  useEffect(() => {
    if (prefilled) return
    const categoryIdParam = typeof params.categoryId === 'string' ? params.categoryId : undefined
    const titleParam = typeof params.title === 'string' ? params.title : undefined
    const descriptionParam = typeof params.description === 'string' ? params.description : undefined
    const cityParam = typeof params.city === 'string' ? params.city : undefined
    const ufParam = typeof params.uf === 'string' ? params.uf : undefined
    const precoParam = typeof params.precoReferencia === 'string' ? params.precoReferencia : undefined

    if (categoryIdParam) setCategoryId(categoryIdParam)
    if (titleParam) setTitulo(titleParam)
    if (descriptionParam) setDescricao(descriptionParam)
    if (precoParam) setPrecoReferencia(precoParam)

    void resolveDemandLocation(cityParam, ufParam).then((location) => {
      setCidade(location.cidade)
      setUf(location.uf)
      setRaioKm(String(location.raio_km))
    })

    setPrefilled(true)
  }, [params, prefilled])

  const pickAttachments = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (result.canceled) return
    setAttachments((prev) => {
      const merged = [...prev, ...result.assets]
      if (merged.length > MAX_ATTACHMENTS) {
        Alert.alert('Anexos', `Máximo de ${MAX_ATTACHMENTS} anexos.`)
        return merged.slice(0, MAX_ATTACHMENTS)
      }
      return merged
    })
  }

  const removeAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((file) => file.uri !== uri))
  }

  const parsedPrecoReferencia = useMemo(() => {
    if (!precoReferencia.trim()) return undefined
    const value = Number(precoReferencia.replace(',', '.'))
    return Number.isFinite(value) && value > 0 ? value : undefined
  }, [precoReferencia])

  const handleSubmit = async (publish: boolean) => {
    if (!titulo || !categoryId) {
      Alert.alert('Campos obrigatórios', 'Preencha título e categoria.')
      return
    }
    const trimmedDescricao = descricao.trim()
    if (trimmedDescricao.length > 0 && trimmedDescricao.length < 10) {
      Alert.alert('Descrição', 'A descrição deve ter no mínimo 10 caracteres.')
      return
    }

    const location = cidade && uf
      ? { cidade, uf: uf.toUpperCase(), raio_km: Number(raioKm) || DEFAULT_RADIUS_KM }
      : await resolveDemandLocation()

    setLoading(true)
    try {
      const demand = await createDemand.mutateAsync({
        titulo,
        descricao: trimmedDescricao,
        category_id: categoryId,
        quantidade: Number(quantidade),
        unidade,
        cidade: location.cidade,
        uf: location.uf,
        raio_km: location.raio_km,
        prazo_desejado: prazoDesejado || undefined,
        observacoes: observacoes || undefined,
        preco_referencia_mercado: parsedPrecoReferencia,
      })
      if (publish) {
        await publishDemand.mutateAsync(demand.id)
        Alert.alert('Publicada', 'Seu pedido foi publicado e os fornecedores serão notificados.')
      } else {
        Alert.alert('Rascunho', 'Pedido salvo como rascunho.')
      }
      router.replace(`/(app)/demands/${demand.id}`)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        Alert.alert('Limite do plano', 'Você atingiu o limite mensal de pedidos.')
      } else {
        Alert.alert('Erro', formatSupabaseError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="p-4 gap-4 pb-10" keyboardShouldPersistTaps="handled">
          <BackButton className="mb-1" fallbackHref={backFallback} preferFallback={!!returnTo} />
          <Text className="text-2xl font-bold text-brand-dark">Nova solicitação</Text>

          <Input label="Título do pedido" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Arroz Integral Agulhinha Tipo 1 5kg" />
          <View>
            <Text className="mb-2 text-sm font-medium text-slate-700">Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {leafCategories.map((cat: Category) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  className={`rounded-full px-4 py-2 ${categoryId === cat.id ? 'bg-brand' : 'border border-slate-200 bg-white'}`}
                >
                  <Text className={categoryId === cat.id ? 'text-white' : 'text-slate-600'}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Descrição do pedido (opcional)"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            className="min-h-24 py-3"
            placeholder={descricaoPlaceholder}
          />

          <View className="flex-row gap-3">
            <Input containerClassName="flex-1" label="Quantidade" value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" />
            <Input containerClassName="flex-1" label="Unidade" value={unidade} onChangeText={setUnidade} />
          </View>

          <Input label="Prazo desejado" value={prazoDesejado} onChangeText={setPrazoDesejado} placeholder="AAAA-MM-DD" />

          {parsedPrecoReferencia ? (
            <View className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
              <Text className="text-xs font-medium uppercase tracking-wide text-brand/80">Preço de referência</Text>
              <Text className="mt-1 text-lg font-bold text-brand">{formatCurrency(parsedPrecoReferencia)}</Text>
            </View>
          ) : (
            <Input
              label="Preço de referência (opcional)"
              value={precoReferencia}
              onChangeText={setPrecoReferencia}
              keyboardType="decimal-pad"
              placeholder="Ex.: 22.00"
            />
          )}

          <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <View className="items-center">
              <Upload size={24} color="#64748b" />
              <Text className="mt-2 text-sm font-medium text-slate-700">Anexos</Text>
              <Text className="mt-1 text-center text-xs text-slate-500">
                Selecione imagens ou documentos — até {MAX_ATTACHMENTS} arquivos
              </Text>
              <Button label="Selecionar arquivos" variant="outline" onPress={() => void pickAttachments()} className="mt-3" />
            </View>
            {attachments.length > 0 ? (
              <View className="mt-4 gap-2">
                {attachments.map((file) => (
                  <View key={file.uri} className="flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Text className="flex-1 text-sm text-slate-700" numberOfLines={1}>
                      {file.fileName ?? file.uri.split('/').pop() ?? 'Anexo'}
                    </Text>
                    <Pressable onPress={() => removeAttachment(file.uri)} className="ml-2 p-1">
                      <X size={16} color="#64748b" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Input label="Observações (opcional)" value={observacoes} onChangeText={setObservacoes} multiline className="min-h-20 py-3" />

          <EligibleSuppliersPanel
            categorySlug={selectedCategory?.slug}
            categoryName={selectedCategory?.name}
            cidade={cidade}
            uf={uf}
          />

          <Button label="Salvar rascunho" variant="outline" onPress={() => void handleSubmit(false)} loading={loading} />
          <Button label="Publicar pedido" onPress={() => void handleSubmit(true)} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
