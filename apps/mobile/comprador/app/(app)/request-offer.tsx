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
import { useCategories } from '@/hooks/use-categories'
import { useCreateDemand, usePublishDemand } from '@/hooks/use-demands'
import { fetchAddressByCep, formatCep } from '@/lib/cep'
import { formatSupabaseError, isQuotaExceededError } from '@/lib/errors'
import { formatCurrency } from '@/lib/utils'
import type { Category } from '@/services/categories'

const MAX_ATTACHMENTS = 10

type PrefillParams = {
  categoryId?: string
  title?: string
  description?: string
  city?: string
  uf?: string
  precoReferencia?: string
  returnTo?: string
}

export default function NewDemandScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<PrefillParams>()
  const { data: categories = [] } = useCategories()
  const createDemand = useCreateDemand()
  const publishDemand = usePublishDemand()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [unidade, setUnidade] = useState('un')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [raioKm, setRaioKm] = useState('50')
  const [prazoDesejado, setPrazoDesejado] = useState('')
  const [precoReferencia, setPrecoReferencia] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [cep, setCep] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined
  const backFallback = returnTo === 'feed' ? '/(app)' : '/(app)/demands'
  const selectedCategory = categories.find((cat: Category) => cat.id === categoryId)
  const deliverySummary = [logradouro, numero && `nº ${numero}`, bairro].filter(Boolean).join(', ')

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
    if (cityParam) setCidade(cityParam)
    if (ufParam) setUf(ufParam)
    if (precoParam) setPrecoReferencia(precoParam)
  }, [params, prefilled])

  useEffect(() => {
    if (prefilled) return
    if (
      params.categoryId ||
      params.title ||
      params.description ||
      params.city ||
      params.uf ||
      params.precoReferencia
    ) {
      setPrefilled(true)
    }
  }, [params, prefilled])

  const suggestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Localização', 'Permissão negada. Informe cidade e UF manualmente.')
      return
    }
    const loc = await Location.getCurrentPositionAsync({})
    const [place] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    })
    if (place?.city) setCidade(place.city)
    if (place?.region) setUf(place.region.slice(0, 2).toUpperCase())
    if (place?.street) setLogradouro(place.street)
    if (place?.district) setBairro(place.district)
  }

  const handleCepLookup = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '')
    if (digits.length !== 8) return

    setCepLoading(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        Alert.alert('CEP', 'CEP não encontrado.')
        return
      }
      setCidade(address.cidade)
      setUf(address.uf)
      if (address.logradouro) setLogradouro(address.logradouro)
      if (address.bairro) setBairro(address.bairro)
    } catch {
      Alert.alert('CEP', 'Não foi possível consultar o CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }

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
    if (!titulo || !descricao || !categoryId || !cidade || !uf) {
      Alert.alert('Campos obrigatórios', 'Preencha título, descrição, categoria, cidade e UF.')
      return
    }
    if (descricao.length < 10) {
      Alert.alert('Descrição', 'A descrição deve ter no mínimo 10 caracteres.')
      return
    }

    setLoading(true)
    try {
      const demand = await createDemand.mutateAsync({
        titulo,
        descricao,
        category_id: categoryId,
        quantidade: Number(quantidade),
        unidade,
        cidade,
        uf: uf.toUpperCase(),
        raio_km: Number(raioKm) || 50,
        prazo_desejado: prazoDesejado || undefined,
        observacoes: observacoes || undefined,
        preco_referencia_mercado: parsedPrecoReferencia,
      })
      if (publish) {
        await publishDemand.mutateAsync(demand.id)
        Alert.alert('Publicada', 'Sua demanda foi publicada e os fornecedores serão notificados.')
      } else {
        Alert.alert('Rascunho', 'Demanda salva como rascunho.')
      }
      router.replace(`/(app)/demands/${demand.id}`)
    } catch (err) {
      if (isQuotaExceededError(err)) {
        Alert.alert('Limite do plano', 'Você atingiu o limite mensal de demandas.')
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
          <Text className="text-2xl font-bold text-brand-dark">Solicitar oferta</Text>

          <Input label="Título da demanda" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Arroz Integral Agulhinha Tipo 1 5kg" />
          <View>
            <Text className="mb-2 text-sm font-medium text-slate-700">Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {categories.map((cat: Category) => (
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
            label="Descrição da demanda"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            className="min-h-24 py-3"
            placeholder="Necessito 500 capacetes de obra com CA válido, cor branca..."
          />

          <View className="flex-row gap-3">
            <Input containerClassName="flex-1" label="Quantidade" value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" />
            <Input containerClassName="flex-1" label="Unidade" value={unidade} onChangeText={setUnidade} />
          </View>

          <Input label="Prazo desejado" value={prazoDesejado} onChangeText={setPrazoDesejado} placeholder="AAAA-MM-DD" />
          <Input label="Raio de busca (km)" value={raioKm} onChangeText={setRaioKm} keyboardType="numeric" />

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

          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Text className="text-sm font-semibold text-slate-800">Endereço de entrega</Text>
            <Text className="mt-1 text-xs text-slate-500">Informe o CEP para preencher logradouro, bairro, cidade e estado.</Text>

            <View className="mt-4 flex-row gap-2">
              <Input
                containerClassName="flex-1"
                label="CEP"
                value={formatCep(cep)}
                onChangeText={(value) => setCep(value.replace(/\D/g, '').slice(0, 8))}
                onBlur={() => void handleCepLookup(cep)}
                placeholder="00000-000"
                keyboardType="numeric"
              />
              <View className="justify-end">
                <Button
                  label={cepLoading ? '...' : 'Buscar'}
                  variant="outline"
                  onPress={() => void handleCepLookup(cep)}
                  disabled={cep.replace(/\D/g, '').length !== 8 || cepLoading}
                  className="h-12 px-4"
                />
              </View>
            </View>

            <Input label="Logradouro" value={logradouro} onChangeText={setLogradouro} placeholder="Rua, avenida, rodovia..." />
            <View className="flex-row gap-3">
              <Input containerClassName="flex-1" label="Número" value={numero} onChangeText={setNumero} placeholder="123" />
              <Input containerClassName="flex-2" label="Bairro" value={bairro} onChangeText={setBairro} placeholder="Ex.: Centro" />
            </View>
            <View className="flex-row gap-3">
              <Input containerClassName="flex-2" label="Cidade" value={cidade} onChangeText={setCidade} />
              <Input containerClassName="flex-1" label="UF" value={uf} onChangeText={setUf} maxLength={2} autoCapitalize="characters" />
            </View>
          </View>

          <Button label="Usar minha localização" variant="outline" onPress={suggestLocation} />

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
            deliverySummary={deliverySummary}
          />

          <Button label="Salvar rascunho" variant="outline" onPress={() => void handleSubmit(false)} loading={loading} />
          <Button label="Publicar demanda" onPress={() => void handleSubmit(true)} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
