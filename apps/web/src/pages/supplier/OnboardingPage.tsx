import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2, Check, FileUp, MapPin, Tags } from 'lucide-react'
import { supplierAddressSchema } from '@keve/shared'
import type { SupplierAddressInput } from '@/services/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  useLookupCnpj,
  useSaveCompany,
  useSaveSupplierCategories,
  useSaveSupplierProfile,
  useSubmitForReview,
  useUploadDocument,
} from '@/hooks/use-onboarding'
import { useCategories } from '@/hooks/use-categories'
import type { CompanyInput, CnpjLookupResult } from '@/services/onboarding'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'CNPJ', icon: Building2 },
  { id: 2, label: 'Área', icon: MapPin },
  { id: 3, label: 'Documentos', icon: FileUp },
  { id: 4, label: 'Categorias', icon: Tags },
  { id: 5, label: 'Revisão', icon: Check },
] as const

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [cnpjInput, setCnpjInput] = useState('')
  const [lookupResult, setLookupResult] = useState<CnpjLookupResult | null>(null)
  const [companySaved, setCompanySaved] = useState<CompanyInput | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const lookupCnpj = useLookupCnpj()
  const saveCompany = useSaveCompany()
  const saveProfile = useSaveSupplierProfile()
  const uploadDocument = useUploadDocument()
  const saveCategories = useSaveSupplierCategories()
  const submitReview = useSubmitForReview()
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()

  const addressForm = useForm<SupplierAddressInput>({
    resolver: zodResolver(supplierAddressSchema),
    defaultValues: { service_city: '', service_uf: '', service_radius_km: 50 },
  })

  async function handleLookupCnpj() {
    const digits = cnpjInput.replace(/\D/g, '')
    if (digits.length !== 14) {
      toast.error('Informe um CNPJ válido com 14 dígitos')
      return
    }
    try {
      const result = await lookupCnpj.mutateAsync(digits)
      setLookupResult(result)
      addressForm.setValue('service_city', result.endereco.cidade)
      addressForm.setValue('service_uf', result.endereco.uf)
      toast.success(result.cached ? 'Dados do CNPJ (cache)' : 'CNPJ encontrado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro na consulta'))
    }
  }

  async function handleSaveCompany() {
    if (!lookupResult) return
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
      toast.success('Dados da empresa salvos')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  async function handleSaveAddress(values: SupplierAddressInput) {
    try {
      await saveProfile.mutateAsync(values)
      setStep(3)
      toast.success('Área de atuação salva')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  async function handleUpload(file: File, type: 'cnpj_card' | 'address_proof') {
    try {
      await uploadDocument.mutateAsync({ file, documentType: type })
      setUploadedDocs((prev) => [...new Set([...prev, type])])
      toast.success('Documento enviado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro no upload'))
    }
  }

  async function handleSaveCategories() {
    if (selectedCategories.length === 0) {
      toast.error('Selecione ao menos uma categoria')
      return
    }
    try {
      await saveCategories.mutateAsync(selectedCategories)
      setStep(5)
      toast.success('Categorias salvas')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  async function handleSubmit() {
    try {
      await submitReview.mutateAsync()
      toast.success('Cadastro enviado para revisão')
      navigate('/supplier/catalog')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar'))
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const docsReady = uploadedDocs.includes('cnpj_card') && uploadedDocs.includes('address_proof')

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Onboarding fornecedor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete o cadastro para enviar propostas e aparecer no marketplace.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s) => {
          const Icon = s.icon
          const active = step === s.id
          const done = step > s.id
          return (
            <div
              key={s.id}
              className={cn(
                'flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs',
                active && 'bg-primary/10 text-primary',
                done && !active && 'text-muted-foreground',
                !active && !done && 'text-muted-foreground/60',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{s.label}</span>
            </div>
          )
        })}
      </nav>

      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="00.000.000/0000-00"
                value={formatCnpj(cnpjInput)}
                onChange={(e) => setCnpjInput(e.target.value.replace(/\D/g, ''))}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleLookupCnpj}
                disabled={lookupCnpj.isPending}
              >
                {lookupCnpj.isPending ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            {lookupResult && (
              <Alert className="border-primary/20 bg-primary/5">
                <p className="font-medium">{lookupResult.razao_social}</p>
                {lookupResult.nome_fantasia && (
                  <p className="text-sm text-muted-foreground">{lookupResult.nome_fantasia}</p>
                )}
                <p className="mt-2 text-sm">
                  {lookupResult.endereco.logradouro}, {lookupResult.endereco.bairro} —{' '}
                  {lookupResult.endereco.cidade}/{lookupResult.endereco.uf}
                </p>
                <p className="text-xs text-muted-foreground">Situação: {lookupResult.situacao}</p>
              </Alert>
            )}
            <Button
              className="w-full"
              disabled={!lookupResult || saveCompany.isPending}
              onClick={handleSaveCompany}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="pt-6">
            <Form {...addressForm}>
              <form onSubmit={addressForm.handleSubmit(handleSaveAddress)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    relative-id="city"
                    control={addressForm.control}
                    name="service_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    relative-id="uf"
                    control={addressForm.control}
                    name="service_uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input maxLength={2} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  relative-id="radius"
                  control={addressForm.control}
                  name="service_radius_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raio de atendimento (km)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={500} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saveProfile.isPending}>
                    Continuar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <DocumentUploadRow
              label="Cartão CNPJ"
              done={uploadedDocs.includes('cnpj_card')}
              loading={uploadDocument.isPending}
              onFile={(f) => handleUpload(f, 'cnpj_card')}
            />
            <DocumentUploadRow
              label="Comprovante de endereço"
              done={uploadedDocs.includes('address_proof')}
              loading={uploadDocument.isPending}
              onFile={(f) => handleUpload(f, 'address_proof')}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!docsReady}
                onClick={() => setStep(4)}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando categorias...</p>
            ) : (
              <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                      selectedCategories.includes(cat.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={saveCategories.isPending}
                onClick={handleSaveCategories}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {companySaved && (
              <section className="space-y-1 text-sm">
                <h3 className="font-medium">Empresa</h3>
                <p>{companySaved.razao_social}</p>
                <p className="text-muted-foreground">
                  CNPJ {formatCnpj(companySaved.cnpj)} — {companySaved.cidade}/{companySaved.uf}
                </p>
              </section>
            )}
            <Separator />
            <section className="space-y-1 text-sm">
              <h3 className="font-medium">Área de atuação</h3>
              <p>
                {addressForm.getValues('service_city')}/{addressForm.getValues('service_uf')} — raio{' '}
                {addressForm.getValues('service_radius_km')} km
              </p>
            </section>
            <Separator />
            <section className="space-y-1 text-sm">
              <h3 className="font-medium">Documentos</h3>
              <p className="text-muted-foreground">{uploadedDocs.length} arquivo(s) enviado(s)</p>
            </section>
            <Separator />
            <section className="space-y-1 text-sm">
              <h3 className="font-medium">Categorias</h3>
              <p className="text-muted-foreground">{selectedCategories.length} selecionada(s)</p>
            </section>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(4)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={submitReview.isPending}
                onClick={handleSubmit}
              >
                {submitReview.isPending ? 'Enviando...' : 'Enviar para revisão'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DocumentUploadRow({
  label,
  done,
  loading,
  onFile,
}: {
  label: string
  done: boolean
  loading: boolean
  onFile: (file: File) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {done && <p className="text-xs text-green-600">Enviado</p>}
      </div>
      <label>
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ''
          }}
        />
        <Button type="button" variant="secondary" size="sm" asChild>
          <span>{done ? 'Reenviar' : 'Enviar'}</span>
        </Button>
      </label>
    </div>
  )
}
