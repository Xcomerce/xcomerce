import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { demandSchema, type DemandInput } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { PaywallModal } from '@/components/common/PaywallModal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { usePageTitle } from '@/hooks/use-page-title'
import { useCategories } from '@/hooks/use-categories'
import {
  useCreateDemand,
  useDemand,
  usePublishDemand,
  useUpdateDemand,
} from '@/hooks/use-demands'
import { translateSupabaseError } from '@/lib/errors'

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const MOCK_SUPPLIERS: Record<string, string[]> = {
  'materiais-construcao': ['Distribuidora SP', 'Ferragens Central', 'EPI Brasil', 'Atacado Sul'],
  'cimento-argamassa': ['Cimento Forte Co.', 'Votoran Atacado', 'Lajes & Concreto SP'],
  'ferragens': ['Ferragens Central', 'Atacado Sul', 'ImportTech'],
  'tintas-vernizes': ['Tintas & Cia', 'Pinturas Express', 'Distribuidora SP'],
  'alimentos-bebidas': ['Distribuidora Rio', 'Minas Laticínios', 'Alfa Bebidas', 'Beta Alimentos'],
  'equipamentos-industriais': ['Tech Parts', 'Gama Metalúrgica', 'EPI Brasil', 'Indústria Sul'],
  'embalagens': ['Embalagens Express', 'Alfa Caixas', 'Papel & Cia'],
  'servicos': ['Instalações Express', 'Manutenção Geral', 'Suporte Técnico'],
  'tecnologia': ['Tech Solutions', 'Info Express', 'Sistemas B2B'],
  'outros': ['Distribuidora Geral', 'Comércio Parceiro', 'Importações Variadas']
}

function getEligibleSuppliers(categorySlug: string | undefined) {
  if (!categorySlug) {
    return { count: 0, list: [], others: 0 }
  }
  const baseSlug = categorySlug.split('-')[0]
  const list = MOCK_SUPPLIERS[categorySlug] || MOCK_SUPPLIERS[baseSlug] || ['Fornecedor Parceiro A', 'Fornecedor Parceiro B', 'Distribuidora Local']
  return {
    count: list.length + 10,
    list: list.slice(0, 4),
    others: Math.max(0, list.length - 4 + 10)
  }
}

export function NewDemandPage() {
  usePageTitle()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const editId = searchParams.get('id') ?? undefined
  const isEditing = !!editId

  const stateData = location.state as { categoryId?: string; title?: string } | null

  const { data: existingDemand, isLoading: loadingDemand, error: demandError } = useDemand(editId)
  const { data: categories, isLoading: loadingCategories, error: categoriesError } = useCategories()
  const createDemand = useCreateDemand()
  const updateDemand = useUpdateDemand()
  const publishDemand = usePublishDemand()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<DemandInput>({
    resolver: zodResolver(demandSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      category_id: '',
      quantidade: 1,
      unidade: 'un',
      cidade: '',
      uf: '',
      raio_km: 50,
      prazo_desejado: '',
      observacoes: '',
    },
  })

  // Preenche dados sugeridos (vinda do Feed de Produtos) se não estiver editando
  useEffect(() => {
    if (isEditing) return
    if (stateData) {
      if (stateData.categoryId) {
        form.setValue('category_id', stateData.categoryId)
      }
      if (stateData.title) {
        form.setValue('titulo', stateData.title)
      }
    }
  }, [stateData, isEditing, form])

  useEffect(() => {
    if (!existingDemand) return
    form.reset({
      titulo: existingDemand.titulo,
      descricao: existingDemand.descricao,
      category_id: existingDemand.category_id,
      quantidade: existingDemand.quantidade,
      unidade: existingDemand.unidade,
      cidade: existingDemand.cidade,
      uf: existingDemand.uf,
      raio_km: existingDemand.raio_km,
      prazo_desejado: existingDemand.prazo_desejado ?? '',
      observacoes: existingDemand.observacoes ?? '',
    })
  }, [existingDemand, form])

  async function saveDraft(values: DemandInput) {
    setFormError(null)
    try {
      if (isEditing && editId) {
        await updateDemand.mutateAsync({ id: editId, input: values })
        toast.success('Demanda atualizada')
        return editId
      }
      const created = await createDemand.mutateAsync(values)
      toast.success('Rascunho salvo')
      return created.id
    } catch (err) {
      const message = translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar')
      setFormError(message)
      toast.error(message)
      return null
    }
  }

  async function onSubmit(values: DemandInput) {
    const id = await saveDraft(values)
    if (!id) return
    navigate(`/buyer/demands/${id}`)
  }

  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) return

    const values = form.getValues()
    const id = isEditing && editId ? editId : await saveDraft(values)
    if (!id) return

    try {
      await publishDemand.mutateAsync(id)
      toast.success('Demanda publicada')
      navigate(`/buyer/demands/${id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao publicar'
      if (message.includes('quota') || message.includes('QUOTA')) {
        setPaywallOpen(true)
      } else {
        toast.error(translateSupabaseError(message))
      }
    }
  }

  const isSaving =
    createDemand.isPending || updateDemand.isPending || publishDemand.isPending || form.formState.isSubmitting

  if (isEditing && loadingDemand) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    )
  }

  if (isEditing && demandError) {
    return (
      <Alert className="border-destructive/50 text-destructive">
        Não foi possível carregar a demanda para edição.
      </Alert>
    )
  }

  if (isEditing && existingDemand && existingDemand.status !== 'RASCUNHO') {
    return (
      <div className="space-y-4">
        <Alert>Esta demanda não pode mais ser editada.</Alert>
        <Button asChild variant="outline">
          <Link to={`/buyer/demands/${existingDemand.id}`}>Ver demanda</Link>
        </Button>
      </div>
    )
  }

  const selectedCategoryId = form.watch('category_id')
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)
  const categorySlug = selectedCategory?.slug
  const watchedCity = form.watch('cidade')
  const watchedUf = form.watch('uf')
  const eligible = getEligibleSuppliers(categorySlug)

  return (
    <div className="space-y-6 lg:pb-0 lg:h-[calc(100vh-150px)] lg:overflow-hidden flex flex-col">
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {isEditing ? 'Editar demanda' : 'Nova demanda'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Descreva o que você precisa para receber propostas de fornecedores.
        </p>
      </div>

      {categoriesError && (
        <Alert className="border-destructive/50 text-destructive">
          Erro ao carregar categorias.
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 lg:space-y-0 lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-3 items-start lg:flex-1 lg:overflow-hidden h-full">
            
            {/* Coluna Esquerda: Detalhes do Formulário */}
            <div className="lg:col-span-2 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-4 pb-24">
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da demanda</CardTitle>
                  <CardDescription>Preencha todos os campos obrigatórios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {formError && (
                    <Alert className="mb-4 border-destructive/50 text-destructive">{formError}</Alert>
                  )}

                  {/* Título e Categoria na mesma linha */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Título da Demanda */}
                    <FormField
                      control={form.control}
                      name="titulo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título da demanda</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: Parafusos inox M8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Categoria as Dropdown */}
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              disabled={loadingCategories}
                              {...field}
                            >
                              <option value="">Selecione uma categoria</option>
                              {(categories ?? []).map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Descrição da demanda */}
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição da demanda</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="Necessito 500 capacetes de obra com CA válido, cor branca..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detalhes (Row 3 columns) */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    
                    {/* Quantidade */}
                    <div className="space-y-2">
                      <FormLabel>Quantidade</FormLabel>
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="quantidade"
                          render={({ field }) => (
                            <Input type="number" min={1} {...field} className="w-2/3" />
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="unidade"
                          render={({ field }) => (
                            <Input placeholder="UN" {...field} className="w-1/3 uppercase" />
                          )}
                        />
                      </div>
                    </div>

                    {/* Prazo desejado */}
                    <FormField
                      control={form.control}
                      name="prazo_desejado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo desejado</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Raio de busca / Validade da oferta */}
                    <FormField
                      control={form.control}
                      name="raio_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raio de busca (km)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={500} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  {/* Local de Entrega */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="cidade"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Cidade de entrega</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="uf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado (UF)</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm uppercase"
                              {...field}
                            >
                              <option value="">UF</option>
                              {BRAZILIAN_UFS.map((uf) => (
                                <option key={uf} value={uf}>
                                  {uf}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Observações */}
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações (opcional)</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                            placeholder="Alguma instrução adicional..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Anexos */}
                  <div className="space-y-3 pt-2">
                    <FormLabel>Anexos</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-sm text-foreground/80 shadow-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>especificacao.pdf</span>
                      </div>
                      
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-background px-3.5 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200 focus:outline-none"
                        onClick={() => toast.info('Funcionalidade de upload de anexos em desenvolvimento')}
                      >
                        <span>+ adicionar</span>
                      </button>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita: Fornecedores Elegíveis e Ações */}
            <div className="space-y-6 lg:col-span-1 lg:h-full lg:overflow-y-auto lg:pb-24">
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground leading-none">
                    Fornecedores elegíveis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {eligible.count > 0 ? (
                    <>
                      <div className="text-5xl font-bold text-primary tracking-tight transition-all duration-200">
                        {eligible.count}
                      </div>
                      <p className="text-sm text-muted-foreground leading-tight">
                        Categoria <span className="font-medium text-foreground">{selectedCategory?.name}</span>
                        {watchedCity && (
                          <span> na região de <span className="font-medium text-foreground">{watchedCity}/{watchedUf || ''}</span></span>
                        )}
                      </p>
                      <ul className="space-y-2.5 pt-2">
                        {eligible.list.map((sup, idx) => (
                          <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground/90 font-medium">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                            <span>{sup}</span>
                          </li>
                        ))}
                      </ul>
                      {eligible.others > 0 && (
                        <p className="text-xs text-muted-foreground pt-1">+ {eligible.others} outros</p>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      Selecione uma categoria para visualizar os fornecedores elegíveis na região.
                    </div>
                  )}

                  {/* Botões de Ação do Painel */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-5 rounded-xl border border-border bg-background hover:bg-secondary/50 text-foreground transition-all duration-200 font-medium"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Salvar
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 py-5 rounded-xl border border-border text-foreground hover:bg-secondary/50 transition-all duration-200 font-medium"
                      onClick={() => navigate('/buyer/dashboard')}
                    >
                      Cancelar
                    </Button>
                  </div>

                  {/* Publicar — ação primária, largura total */}
                  <Button
                    type="button"
                    disabled={isSaving || !selectedCategoryId}
                    className="w-full py-5 rounded-xl text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all duration-200"
                    onClick={() => void handlePublish()}
                  >
                    {publishDemand.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Publicar demanda
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        </form>
      </Form>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} quotaType="demands" />
    </div>
  )
}
