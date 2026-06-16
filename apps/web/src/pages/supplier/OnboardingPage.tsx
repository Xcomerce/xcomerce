import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2, Check, ChevronDown, FileUp, MapPin, Tags, type LucideIcon } from 'lucide-react'
import { supplierAddressSchema, SUPPLIER_STATUS_LABELS } from '@keve/shared'
import type { SupplierAddressInput } from '@/services/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import {
  useLookupCnpj,
  useOnboardingState,
  useSaveCompany,
  useSaveSupplierCategories,
  useSaveSupplierProfile,
  useSubmitForReview,
  useUploadDocument,
} from '@/hooks/use-onboarding'
import { useCategories } from '@/hooks/use-categories'
import { useAuth } from '@/contexts/auth-context'
import {
  companyToInput,
  companyToLookupResult,
  computeOnboardingStep,
  getOnboardingState,
  lookupOwnCompanyCnpj,
} from '@/services/onboarding'
import type { CompanyInput, CnpjLookupResult } from '@/services/onboarding'
import { translateSupabaseError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

const STEPS = [
  {
    id: 1,
    label: 'CNPJ',
    description: 'Consulte e confirme os dados da sua empresa',
    icon: Building2,
  },
  {
    id: 2,
    label: 'Área',
    description: 'Defina cidade, UF e raio de atendimento',
    icon: MapPin,
  },
  {
    id: 3,
    label: 'Documentos',
    description: 'Envie cartão CNPJ e comprovante de endereço',
    icon: FileUp,
  },
  {
    id: 4,
    label: 'Categorias',
    description: 'Escolha os segmentos que você atende',
    icon: Tags,
  },
  {
    id: 5,
    label: 'Revisão',
    description: 'Confira tudo e envie para análise',
    icon: Check,
  },
] as const

const DOCUMENT_LABELS: Record<string, string> = {
  cnpj_card: 'Cartão CNPJ',
  address_proof: 'Comprovante de endereço',
}

function ReviewBlock({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border/80 bg-card p-4 shadow-sm',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5 border-b border-border/60 pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  )
}

function ReviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 leading-snug text-foreground">{value}</p>
    </div>
  )
}

function OnboardingStepper({
  step,
  isFullyComplete = false,
  renderStepContent,
}: {
  step: number
  isFullyComplete?: boolean
  renderStepContent?: (stepId: number) => ReactNode
}) {
  const [mobileOpenStep, setMobileOpenStep] = useState<number | null>(step)

  useEffect(() => {
    setMobileOpenStep(step)
  }, [step])

  function renderStepIcon(
    Icon: (typeof STEPS)[number]['icon'],
    active: boolean,
    done: boolean,
    reachable: boolean,
    size: 'sm' | 'md',
  ) {
    const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
    const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'

    return (
      <span
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-center rounded-full',
          sizeClass,
          active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
          done && !active && 'bg-emerald-500 text-white ring-4 ring-emerald-500/15',
          !active && !done && reachable && 'bg-muted text-muted-foreground',
          !reachable && 'bg-muted/60 text-muted-foreground',
        )}
      >
        {done && !active ? (
          <Check className={cn(iconClass, 'stroke-[3]')} />
        ) : (
          <Icon className={iconClass} />
        )}
      </span>
    )
  }

  function renderTimelineRail(done: boolean, isLast: boolean, size: 'sm' | 'md') {
    if (isLast) return null

    return (
      <div
        aria-hidden
        className={cn(
          'absolute left-1/2 w-0 -translate-x-1/2 border-l-2 border-dashed',
          size === 'sm' ? 'top-8' : 'top-9',
          'bottom-0',
          done ? 'border-emerald-500/50' : 'border-border/80',
        )}
      />
    )
  }

  return (
    <>
      <nav className="flex flex-col lg:hidden">
        {STEPS.map((s, index) => {
          const Icon = s.icon
          const active = !isFullyComplete && step === s.id
          const done = isFullyComplete || step > s.id
          const reachable = s.id <= step
          const isOpen = mobileOpenStep === s.id
          const isLast = index === STEPS.length - 1

          return (
            <div
              key={s.id}
              className={cn('relative flex gap-3', !isLast && 'pb-5')}
            >
              <div className="relative w-8 shrink-0 self-stretch">
                <div className="flex justify-center">{renderStepIcon(Icon, active, done, reachable, 'sm')}</div>
                {renderTimelineRail(done, isLast, 'sm')}
              </div>

              <div
                className={cn(
                  'min-w-0 flex-1 overflow-hidden rounded-xl border transition-colors',
                  active && 'border-primary/30 bg-primary/5',
                  done && !active && 'border-emerald-500/25 bg-emerald-500/5',
                  !active && !done && reachable && 'border-border bg-card',
                  !reachable && 'border-border/60 bg-muted/20 opacity-70',
                )}
              >
                <button
                  type="button"
                  disabled={!reachable}
                  aria-expanded={active || isOpen}
                  onClick={() => {
                    if (active) return
                    setMobileOpenStep(isOpen ? null : s.id)
                  }}
                  className="flex w-full items-start gap-3 p-3 text-left disabled:cursor-not-allowed"
                >
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          active && 'text-primary',
                          done && !active && 'text-emerald-700 dark:text-emerald-400',
                        )}
                      >
                        {s.label}
                      </p>
                      {done && !active && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Concluída
                        </span>
                      )}
                    </div>
                    {!isOpen && reachable && !done && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  {reachable && (
                    <ChevronDown
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  )}
                </button>
                {(active || isOpen) && (
                  <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
                    {active && renderStepContent ? (
                      renderStepContent(s.id)
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </nav>

      <nav className="hidden flex-col lg:flex">
        {STEPS.map((s, index) => {
          const Icon = s.icon
          const active = !isFullyComplete && step === s.id
          const done = isFullyComplete || step > s.id
          const reachable = s.id <= step
          const isLast = index === STEPS.length - 1

          return (
            <div
              key={s.id}
              className={cn('relative flex gap-3', !isLast && 'pb-5')}
            >
              <div className="relative w-9 shrink-0 self-stretch">
                <div className="flex justify-center">{renderStepIcon(Icon, active, done, reachable, 'md')}</div>
                {renderTimelineRail(done, isLast, 'md')}
              </div>

              <div
                className={cn(
                  'min-w-0 flex-1 rounded-xl px-4 py-3 text-left text-xs transition-colors',
                  active && 'bg-primary/10 text-primary',
                  done && !active && 'bg-emerald-500/5',
                  !active && !done && reachable && 'text-foreground',
                  !active && !done && !reachable && 'text-muted-foreground/60',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'font-medium leading-tight',
                      active && 'text-primary',
                      done && !active && 'text-emerald-700 dark:text-emerald-400',
                    )}
                  >
                    {s.label}
                  </p>
                  {done && !active && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      Concluída
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-0.5 text-[11px] leading-snug text-muted-foreground',
                    active && 'text-primary/80',
                  )}
                >
                  {s.description}
                </p>
              </div>
            </div>
          )
        })}
      </nav>
    </>
  )
}

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
  const { user, supplierStatus } = useAuth()
  const hydratedRef = useRef(false)
  const [step, setStep] = useState(1)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
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
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()

  const addressForm = useForm<SupplierAddressInput>({
    resolver: zodResolver(supplierAddressSchema),
    defaultValues: { service_city: '', service_uf: '', service_radius_km: 50 },
  })

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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

    setUploadedDocs(savedState.documents.map((doc) => doc.document_type))
    setSelectedCategories(savedState.categoryIds)
    setStep(computeOnboardingStep(savedState))
  }, [savedState])

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
          toast.success('CNPJ da sua empresa recuperado')
          return
        }
      }
      toast.error(translateSupabaseError(message))
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
      const result = await submitReview.mutateAsync()
      if (result.alreadyApproved) {
        toast.success('Seu cadastro já está aprovado. Bem-vindo à plataforma!')
        navigate('/supplier/board')
        return
      }
      toast.success(
        result.alreadySubmitted
          ? 'Seu cadastro já está em revisão pela equipe Keve.'
          : 'Cadastro enviado para revisão',
      )
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
  const activeStep = STEPS.find((s) => s.id === step)
  const isApproved = supplierStatus === 'aprovado'
  const isInReview = supplierStatus === 'em_revisao'

  if (isHydrating) {
    return (
      <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
          <LoadingSkeleton className="h-64 w-full rounded-xl" />
          <LoadingSkeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  function renderStepPanel(stepId: number) {
    switch (stepId) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="00.000.000/0000-00"
                value={formatCnpj(cnpjInput)}
                onChange={(e) => setCnpjInput(e.target.value.replace(/\D/g, ''))}
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 sm:w-auto"
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
          </div>
        )
      case 2:
        return (
          <Form {...addressForm}>
            <form id="onboarding-address-form" onSubmit={addressForm.handleSubmit(handleSaveAddress)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
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
                  control={addressForm.control}
                  name="service_uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={2}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
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
            </form>
          </Form>
        )
      case 3:
        return (
          <div className="space-y-4">
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
          </div>
        )
      case 4:
        return (
          <div className="space-y-4">
            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando categorias...</p>
            ) : (
              <div className="grid max-h-[min(28rem,55vh)] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        )
      case 5: {
        const selectedCategoryNames = categories
          .filter((cat) => selectedCategories.includes(cat.id))
          .map((cat) => cat.name)
        const serviceCity = addressForm.getValues('service_city')
        const serviceUf = addressForm.getValues('service_uf')
        const serviceRadius = addressForm.getValues('service_radius_km')

        return (
          <div className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <p className="text-sm">
                Revise os dados abaixo antes de enviar seu cadastro para análise da equipe Keve.
              </p>
            </Alert>

            <div className="grid gap-4 lg:grid-cols-2">
              {companySaved && (
                <ReviewBlock icon={Building2} title="Empresa" className="lg:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReviewField label="Razão social" value={companySaved.razao_social} />
                    {companySaved.nome_fantasia && (
                      <ReviewField label="Nome fantasia" value={companySaved.nome_fantasia} />
                    )}
                    <ReviewField label="CNPJ" value={formatCnpj(companySaved.cnpj)} />
                    <ReviewField
                      label="Localização"
                      value={`${companySaved.cidade}/${companySaved.uf}`}
                    />
                    {companySaved.situacao && (
                      <ReviewField label="Situação cadastral" value={companySaved.situacao} />
                    )}
                  </div>
                </ReviewBlock>
              )}

              <ReviewBlock icon={MapPin} title="Área de atuação">
                <ReviewField label="Cidade / UF" value={`${serviceCity}/${serviceUf}`} />
                <ReviewField label="Raio de atendimento" value={`${serviceRadius} km`} />
              </ReviewBlock>

              <ReviewBlock icon={FileUp} title="Documentos">
                {uploadedDocs.length > 0 ? (
                  <ul className="space-y-2">
                    {uploadedDocs.map((docType) => (
                      <li
                        key={docType}
                        className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                      >
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{DOCUMENT_LABELS[docType] ?? docType}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nenhum documento enviado.</p>
                )}
              </ReviewBlock>

              <ReviewBlock icon={Tags} title="Categorias" className="lg:col-span-2">
                {selectedCategoryNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma categoria selecionada.</p>
                )}
              </ReviewBlock>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-custom p-4 lg:p-6">
        {(isApproved || isInReview) && (
          <Alert
            className={cn(
              'mb-4',
              isApproved ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-primary/20 bg-primary/5',
            )}
          >
            <p className="text-sm">
              {isApproved ? (
                <>
                  Seu cadastro está <strong>{SUPPLIER_STATUS_LABELS.aprovado}</strong>. Você pode
                  consultar os dados abaixo ou ir para o painel do fornecedor.
                </>
              ) : (
                <>
                  Seu cadastro está <strong>{SUPPLIER_STATUS_LABELS.em_revisao}</strong>. A equipe
                  Keve está analisando suas informações.
                </>
              )}
            </p>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="lg:sticky lg:top-0">
            <OnboardingStepper
              step={step}
              isFullyComplete={isApproved}
              renderStepContent={isDesktop ? undefined : (stepId) => renderStepPanel(stepId)}
            />
          </aside>

          {isDesktop && (
            <div className="min-w-0">
              <h2 className="mb-4 text-lg font-semibold">{activeStep?.label}</h2>
              {renderStepPanel(step)}
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 pb-safe-bottom backdrop-blur-sm lg:flex-row lg:items-center lg:justify-end lg:gap-3 lg:px-6">
        {step > 1 && !isApproved && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl lg:order-1 lg:w-auto"
            onClick={() => setStep(step - 1)}
          >
            Voltar
          </Button>
        )}
        {step === 1 && (
          <Button
            type="button"
            className="w-full rounded-xl font-semibold lg:w-auto"
            disabled={!lookupResult || saveCompany.isPending}
            onClick={handleSaveCompany}
          >
            {saveCompany.isPending ? 'Salvando...' : 'Continuar'}
          </Button>
        )}
        {step === 2 && (
          <Button
            type="submit"
            form="onboarding-address-form"
            className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? 'Salvando...' : 'Continuar'}
          </Button>
        )}
        {step === 3 && (
          <Button
            type="button"
            className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
            disabled={!docsReady}
            onClick={() => setStep(4)}
          >
            Continuar
          </Button>
        )}
        {step === 4 && (
          <Button
            type="button"
            className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
            disabled={saveCategories.isPending}
            onClick={handleSaveCategories}
          >
            {saveCategories.isPending ? 'Salvando...' : 'Continuar'}
          </Button>
        )}
        {step === 5 && isApproved && (
          <Button
            type="button"
            className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
            onClick={() => navigate('/supplier/board')}
          >
            Ir para o painel
          </Button>
        )}
        {step === 5 && !isApproved && (
          <Button
            type="button"
            className="w-full rounded-xl font-semibold lg:order-2 lg:w-auto"
            disabled={submitReview.isPending}
            onClick={handleSubmit}
          >
            {submitReview.isPending ? 'Enviando...' : 'Enviar para revisão'}
          </Button>
        )}
      </footer>
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
