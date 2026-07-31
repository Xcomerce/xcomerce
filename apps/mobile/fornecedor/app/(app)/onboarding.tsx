import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Building2, Check, FileUp, MapPin, Tags } from 'lucide-react-native'
import { supplierAddressSchema, SUPPLIER_STATUS_LABELS } from '@keve/shared'
import type { SupplierAddressInput } from '@/services/onboarding'
import { BackButton } from '@/components/common/back-button'
import { AppHeader } from '@/components/layout/AppHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  useLookupCnpj,
  useOnboardingState,
  useSaveCompany,
  useSaveSupplierCategories,
  useSaveSupplierProfile,
  useSubmitForReview,
  useUploadDocument,
} from '@/hooks/use-onboarding'
import { useCategories, type Category } from '@/hooks/use-categories'
import { useAuth } from '@/contexts/auth-context'
import {
  companyToInput,
  companyToLookupResult,
  computeOnboardingStep,
  getOnboardingState,
  lookupOwnCompanyCnpj,
} from '@/services/onboarding'
import type { CompanyInput, CnpjLookupResult } from '@/services/onboarding'
import { formatSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'CNPJ', icon: Building2 },
  { id: 2, label: 'Área', icon: MapPin },
  { id: 3, label: 'Documentos', icon: FileUp },
  { id: 4, label: 'Categorias', icon: Tags },
  { id: 5, label: 'Revisão', icon: Check },
] as const

const DOCUMENT_LABELS: Record<string, string> = {
  cnpj_card: 'Cartão CNPJ',
  address_proof: 'Comprovante de endereço',
}

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { user, supplierStatus } = useAuth()
  const hydratedRef = useRef(false)
  const [step, setStep] = useState(1)
  const [cnpjInput, setCnpjInput] = useState('')
  const [lookupResult, setLookupResult] = useState<CnpjLookupResult | null>(null)
  const [companySaved, setCompanySaved] = useState<CompanyInput | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const { data: savedState, isLoading: isHydrating } = useOnboardingState()
  const lookupCnpj = useLookupCnpj()
  const saveCompany = useSaveCompany()
  const saveProfile = useSaveSupplierProfile()
  const uploadDocument = useUploadDocument()
  const saveCategories = useSaveSupplierCategories()
  const submitReview = useSubmitForReview()
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()
  const categories: Category[] = categoriesData ?? []

  const addressForm = useForm<SupplierAddressInput>({
    resolver: zodResolver(supplierAddressSchema),
    defaultValues: { service_city: '', service_uf: '', service_radius_km: 50 },
  })

  useEffect(() => {
    if (!savedState || hydratedRef.current) return
    hydratedRef.current = true
    if (savedState.company) {
      setCnpjInput(savedState.company.cnpj)
      setLookupResult(companyToLookupResult(savedState.company))
      setCompanySaved(companyToInput(savedState.company))
    }
    if (savedState.profile?.service_city?.trim() && savedState.profile.service_uf?.trim()) {
      addressForm.reset({
        service_city: savedState.profile.service_city,
        service_uf: savedState.profile.service_uf,
        service_radius_km: savedState.profile.service_radius_km ?? 50,
      })
    } else if (savedState.company) {
      addressForm.reset({
        service_city: savedState.company.cidade,
        service_uf: savedState.company.uf,
        service_radius_km: savedState.profile?.service_radius_km ?? 50,
      })
    }
    setUploadedDocs(savedState.documents.map((doc: { document_type: string }) => doc.document_type))
    setSelectedCategories(savedState.categoryIds)
    setStep(computeOnboardingStep(savedState))
  }, [savedState, addressForm])

  async function handleLookupCnpj() {
    const digits = cnpjInput.replace(/\D/g, '')
    if (digits.length !== 14) {
      Alert.alert('CNPJ', 'Informe um CNPJ válido com 14 dígitos')
      return
    }
    try {
      const result = await lookupCnpj.mutateAsync(digits)
      setLookupResult(result)
      addressForm.setValue('service_city', result.endereco.cidade)
      addressForm.setValue('service_uf', result.endereco.uf)
      Alert.alert('Sucesso', result.cached ? 'Dados do CNPJ (cache)' : 'CNPJ encontrado')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na consulta'
      if (user && message.toLowerCase().includes('cadastrado')) {
        const own = await lookupOwnCompanyCnpj(user.id, digits)
        if (own) {
          setLookupResult(own)
          addressForm.setValue('service_city', own.endereco.cidade)
          addressForm.setValue('service_uf', own.endereco.uf)
          if (!companySaved) {
            const state = await getOnboardingState(user.id)
            if (state.company) setCompanySaved(companyToInput(state.company))
          }
          Alert.alert('Sucesso', 'CNPJ da sua empresa recuperado')
          return
        }
      }
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleSaveCompany() {
    if (!lookupResult) return
    if (companySaved) {
      setStep(2)
      return
    }
    const input: CompanyInput = {
      cnpj: lookupResult.cnpj,
      razao_social: lookupResult.razao_social,
      nome_fantasia: lookupResult.nome_fantasia,
      cidade: lookupResult.endereco.cidade,
      uf: lookupResult.endereco.uf,
      logradouro: lookupResult.endereco.logradouro,
      bairro: lookupResult.endereco.bairro,
      cep: lookupResult.endereco.cep,
      situacao: lookupResult.situacao,
    }
    try {
      await saveCompany.mutateAsync(input)
      setCompanySaved(input)
      setStep(2)
      Alert.alert('Sucesso', 'Dados da empresa salvos')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleSaveAddress(values: SupplierAddressInput) {
    try {
      await saveProfile.mutateAsync(values)
      setStep(3)
      Alert.alert('Sucesso', 'Área de atuação salva')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function pickDocument(type: 'cnpj_card' | 'address_proof') {
    Alert.alert('Enviar documento', 'Escolha a origem do arquivo', [
      {
        text: 'Galeria de fotos',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 })
          if (result.canceled || !result.assets[0]) return
          const asset = result.assets[0]
          await handleUpload(
            { uri: asset.uri, fileName: asset.fileName ?? `${type}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' },
            type,
          )
        },
      },
      {
        text: 'Arquivo (PDF/imagem)',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] })
          if (result.canceled || !result.assets[0]) return
          const asset = result.assets[0]
          await handleUpload(
            { uri: asset.uri, fileName: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' },
            type,
          )
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function handleUpload(
    file: { uri: string; fileName: string; mimeType: string },
    type: 'cnpj_card' | 'address_proof',
  ) {
    try {
      await uploadDocument.mutateAsync({ file, documentType: type })
      setUploadedDocs((prev) => [...new Set([...prev, type])])
      Alert.alert('Sucesso', 'Documento enviado')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleSaveCategories() {
    if (selectedCategories.length === 0) {
      Alert.alert('Categorias', 'Selecione ao menos uma categoria')
      return
    }
    try {
      await saveCategories.mutateAsync(selectedCategories)
      setStep(5)
      Alert.alert('Sucesso', 'Categorias salvas')
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  async function handleSubmit() {
    try {
      const result = await submitReview.mutateAsync()
      if (result.alreadyApproved) {
        Alert.alert('Aprovado', 'Seu cadastro já está aprovado!', [
          { text: 'OK', onPress: () => router.replace('/(app)/board') },
        ])
        return
      }
      Alert.alert(
        'Enviado',
        result.alreadySubmitted
          ? 'Seu cadastro já está em revisão pela equipe Keve.'
          : 'Cadastro enviado para revisão',
        [{ text: 'OK', onPress: () => router.replace('/(app)/catalog') }],
      )
    } catch (err) {
      Alert.alert('Erro', formatSupabaseError(err))
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const docsReady = uploadedDocs.includes('cnpj_card') && uploadedDocs.includes('address_proof')
  const isApproved = supplierStatus === 'aprovado'
  const isInReview = supplierStatus === 'em_revisao'

  if (isHydrating) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <LoadingSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <AppHeader title="Onboarding fornecedor" />
      <BackButton className="mx-4 mb-2" fallbackHref="/(app)/profile" />

      <ScrollView contentContainerClassName="gap-4 px-4 pb-32">
        {(isApproved || isInReview) && (
          <Card className={isApproved ? 'border-emerald-200 bg-emerald-50' : 'border-brand/20 bg-brand/5'}>
            <Text className="text-sm text-slate-700">
              {isApproved
                ? `Seu cadastro está ${SUPPLIER_STATUS_LABELS.aprovado}. Consulte os dados ou vá ao painel.`
                : `Seu cadastro está ${SUPPLIER_STATUS_LABELS.em_revisao}. A equipe Keve está analisando.`}
            </Text>
          </Card>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {STEPS.map((s) => {
            const done = isApproved || step > s.id
            const active = !isApproved && step === s.id
            return (
              <View
                key={s.id}
                className={cn(
                  'flex-row items-center gap-2 rounded-full border px-3 py-2',
                  active && 'border-brand bg-brand/10',
                  done && !active && 'border-emerald-300 bg-emerald-50',
                  !active && !done && 'border-slate-200 bg-white',
                )}
              >
                <s.icon size={16} color={active ? '#2F66F3' : done ? '#059669' : '#64748b'} />
                <Text
                  className={cn(
                    'text-sm font-medium',
                    active && 'text-brand',
                    done && !active && 'text-emerald-700',
                  )}
                >
                  {s.label}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        {step === 1 && (
          <Card className="gap-4">
            <Text className="font-semibold text-slate-900">Consulte e confirme os dados da empresa</Text>
            <Input
              label="CNPJ"
              value={formatCnpj(cnpjInput)}
              onChangeText={(v) => setCnpjInput(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <Button
              label={lookupCnpj.isPending ? 'Buscando...' : 'Buscar CNPJ'}
              variant="outline"
              onPress={handleLookupCnpj}
              loading={lookupCnpj.isPending}
            />
            {lookupResult ? (
              <View className="rounded-xl border border-brand/20 bg-brand/5 p-3">
                <Text className="font-medium">{lookupResult.razao_social}</Text>
                {lookupResult.nome_fantasia ? (
                  <Text className="text-sm text-slate-500">{lookupResult.nome_fantasia}</Text>
                ) : null}
                <Text className="mt-2 text-sm">
                  {lookupResult.endereco.logradouro}, {lookupResult.endereco.bairro} —{' '}
                  {lookupResult.endereco.cidade}/{lookupResult.endereco.uf}
                </Text>
              </View>
            ) : null}
          </Card>
        )}

        {step === 2 && (
          <Card className="gap-4">
            <Text className="font-semibold text-slate-900">Área de atuação</Text>
            <Controller
              control={addressForm.control}
              name="service_city"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Cidade" value={value} onChangeText={onChange} onBlur={onBlur} />
              )}
            />
            <Controller
              control={addressForm.control}
              name="service_uf"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="UF"
                  value={value}
                  onChangeText={(v) => onChange(v.toUpperCase())}
                  onBlur={onBlur}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              )}
            />
            <Controller
              control={addressForm.control}
              name="service_radius_km"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Raio de atendimento (km)"
                  value={String(value ?? '')}
                  onChangeText={(v) => onChange(Number(v) || 0)}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                />
              )}
            />
          </Card>
        )}

        {step === 3 && (
          <Card className="gap-3">
            <Text className="font-semibold text-slate-900">Documentos</Text>
            {(['cnpj_card', 'address_proof'] as const).map((type) => (
              <View
                key={type}
                className="flex-row items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <View>
                  <Text className="font-medium text-slate-900">{DOCUMENT_LABELS[type]}</Text>
                  {uploadedDocs.includes(type) ? (
                    <Text className="text-xs text-green-600">Enviado</Text>
                  ) : null}
                </View>
                <Button
                  label={uploadedDocs.includes(type) ? 'Reenviar' : 'Enviar'}
                  variant="outline"
                  onPress={() => pickDocument(type)}
                  loading={uploadDocument.isPending}
                  className="px-4"
                />
              </View>
            ))}
          </Card>
        )}

        {step === 4 && (
          <Card className="gap-3">
            <Text className="font-semibold text-slate-900">Categorias atendidas</Text>
            {categoriesLoading ? (
              <Text className="text-sm text-slate-500">Carregando categorias...</Text>
            ) : (
              categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  className={cn(
                    'flex-row items-center gap-3 rounded-lg border p-3',
                    selectedCategories.includes(cat.id) ? 'border-brand bg-brand/5' : 'border-slate-200',
                  )}
                >
                  <View
                    className={cn(
                      'h-5 w-5 items-center justify-center rounded border',
                      selectedCategories.includes(cat.id) ? 'border-brand bg-brand' : 'border-slate-300',
                    )}
                  >
                    {selectedCategories.includes(cat.id) ? (
                      <Check size={14} color="#fff" />
                    ) : null}
                  </View>
                  <Text className="text-sm text-slate-800">{cat.name}</Text>
                </Pressable>
              ))
            )}
          </Card>
        )}

        {step === 5 && (
          <Card className="gap-4">
            <Text className="font-semibold text-slate-900">Revisão</Text>
            <Text className="text-sm text-slate-600">
              Revise os dados antes de enviar para análise da equipe Keve.
            </Text>
            {companySaved ? (
              <View>
                <Text className="text-xs font-semibold uppercase text-slate-500">Empresa</Text>
                <Text className="mt-1 font-medium">{companySaved.razao_social}</Text>
                <Text className="text-sm text-slate-600">CNPJ: {formatCnpj(companySaved.cnpj)}</Text>
              </View>
            ) : null}
            <View>
              <Text className="text-xs font-semibold uppercase text-slate-500">Área</Text>
              <Text className="mt-1 text-sm">
                {addressForm.getValues('service_city')}/{addressForm.getValues('service_uf')} ·{' '}
                {addressForm.getValues('service_radius_km')} km
              </Text>
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase text-slate-500">Documentos</Text>
              <Text className="mt-1 text-sm">
                {uploadedDocs.map((d) => DOCUMENT_LABELS[d] ?? d).join(', ') || 'Nenhum'}
              </Text>
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase text-slate-500">Categorias</Text>
              <Text className="mt-1 text-sm">
                {categories
                  .filter((c) => selectedCategories.includes(c.id))
                  .map((c) => c.name)
                  .join(', ') || 'Nenhuma'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-slate-200 bg-white p-4">
        {step > 1 && !isApproved ? (
          <Button label="Voltar" variant="outline" onPress={() => setStep(step - 1)} />
        ) : null}
        {step === 1 ? (
          <Button
            label={saveCompany.isPending ? 'Salvando...' : 'Continuar'}
            onPress={handleSaveCompany}
            loading={saveCompany.isPending}
            disabled={!lookupResult}
          />
        ) : null}
        {step === 2 ? (
          <Button
            label={saveProfile.isPending ? 'Salvando...' : 'Continuar'}
            onPress={addressForm.handleSubmit(handleSaveAddress)}
            loading={saveProfile.isPending}
          />
        ) : null}
        {step === 3 ? (
          <Button label="Continuar" onPress={() => setStep(4)} disabled={!docsReady} />
        ) : null}
        {step === 4 ? (
          <Button
            label={saveCategories.isPending ? 'Salvando...' : 'Continuar'}
            onPress={handleSaveCategories}
            loading={saveCategories.isPending}
          />
        ) : null}
        {step === 5 && isApproved ? (
          <Button label="Ir para o painel" onPress={() => router.replace('/(app)/board')} />
        ) : null}
        {step === 5 && !isApproved ? (
          <Button
            label={submitReview.isPending ? 'Enviando...' : 'Enviar para revisão'}
            onPress={handleSubmit}
            loading={submitReview.isPending}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}
