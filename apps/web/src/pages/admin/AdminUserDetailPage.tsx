import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  History,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react'
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useAdminUserActivity,
  useAdminUserDetail,
  useAdminUserHistory,
  useConfirmAccountDeletion,
  useLogProfileAccess,
  useRefreshCompanyCnpj,
  useRequestAccountDeletion,
  useUpdateAdminUserProfile,
} from '@/hooks/use-admin'
import type { AdminUserDetail, AdminUserProfileChanges } from '@/services/admin-user-profile'
import { accountTypeLabel } from '@/services/admin-user-profile'
import { translateSupabaseError } from '@/lib/errors'
import { BRAZILIAN_UFS } from '@/config/brazil'
import { cn } from '@/lib/utils'

const MIN_REASON_LENGTH = 10
const DELETE_PHRASE = 'EXCLUIR CONTA'

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nome',
  phone: 'Telefone',
  email: 'E-mail',
  city: 'Cidade',
  uf: 'UF',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  bairro: 'Bairro',
  complemento: 'Complemento',
  store_name: 'Nome da loja',
  service_city: 'Cidade de atendimento',
  service_uf: 'UF de atendimento',
  service_radius_km: 'Raio de atendimento (km)',
  razao_social: 'Razão social',
  nome_fantasia: 'Nome fantasia',
  situacao: 'Situação cadastral',
  account_deleted: 'Conta excluída',
}

const ACCESS_TYPE_LABELS: Record<string, string> = {
  search_result: 'Resultado de busca',
  profile_view: 'Visualização da ficha',
  tab_activity: 'Consulta aba Atividade',
  tab_history: 'Consulta aba Histórico',
}

type TabId = 'dados' | 'atividade' | 'historico'

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function formatCnpj(cnpj: string | null | undefined) {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—'
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

const TEXTAREA_CLASS =
  'flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function LgpdAccessDialog({
  open,
  loading,
  onConfirm,
}: {
  open: boolean
  loading: boolean
  onConfirm: (justification: string) => void
}) {
  const [justification, setJustification] = useState('')

  if (!open) return null

  const valid = justification.trim().length >= MIN_REASON_LENGTH

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Justificativa de acesso (LGPD)</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Informe o motivo do acesso a dados pessoais deste usuário. Este registro não pode ser
          alterado.
        </p>
        <textarea
          className={TEXTAREA_CLASS}
          value={justification}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJustification(e.target.value)}
          placeholder="Descreva o motivo (mínimo 10 caracteres)"
          rows={4}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {justification.trim().length}/{MIN_REASON_LENGTH} caracteres mínimos
        </p>
        <Button
          className="mt-4 w-full"
          disabled={!valid || loading}
          onClick={() => onConfirm(justification.trim())}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Acessar ficha
        </Button>
      </div>
    </div>
  )
}

function ProfileFormState({ detail }: { detail: AdminUserDetail }) {
  const updateProfile = useUpdateAdminUserProfile()
  const refreshCnpj = useRefreshCompanyCnpj()
  const requestDeletion = useRequestAccountDeletion()
  const confirmDeletion = useConfirmAccountDeletion()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState(detail.profile.full_name)
  const [phone, setPhone] = useState(detail.profile.phone ?? '')
  const [email, setEmail] = useState(detail.profile.email ?? '')
  const [buyerCity, setBuyerCity] = useState(detail.buyerProfile?.city ?? '')
  const [buyerUf, setBuyerUf] = useState(detail.buyerProfile?.uf ?? '')
  const [buyerCep, setBuyerCep] = useState(detail.buyerProfile?.cep ?? '')
  const [buyerLogradouro, setBuyerLogradouro] = useState(detail.buyerProfile?.logradouro ?? '')
  const [buyerNumero, setBuyerNumero] = useState(detail.buyerProfile?.numero ?? '')
  const [buyerBairro, setBuyerBairro] = useState(detail.buyerProfile?.bairro ?? '')
  const [buyerComplemento, setBuyerComplemento] = useState(detail.buyerProfile?.complemento ?? '')
  const [storeName, setStoreName] = useState(detail.supplierProfile?.store_name ?? '')
  const [serviceCity, setServiceCity] = useState(detail.supplierProfile?.service_city ?? '')
  const [serviceUf, setServiceUf] = useState(detail.supplierProfile?.service_uf ?? '')
  const [serviceRadius, setServiceRadius] = useState(
    String(detail.supplierProfile?.service_radius_km ?? 50),
  )
  const [reason, setReason] = useState('')

  const [cnpjReason, setCnpjReason] = useState('')
  const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false)

  const [deleteReason, setDeleteReason] = useState('')
  const [deleteStep, setDeleteStep] = useState<'idle' | 'impact' | 'confirm'>('idle')
  const [deleteToken, setDeleteToken] = useState<string | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<{
    demands: number
    orders: number
    offers: number
    has_active_subscription: boolean
  } | null>(null)
  const [deletePhrase, setDeletePhrase] = useState('')

  useEffect(() => {
    setFullName(detail.profile.full_name)
    setPhone(detail.profile.phone ?? '')
    setEmail(detail.profile.email ?? '')
    setBuyerCity(detail.buyerProfile?.city ?? '')
    setBuyerUf(detail.buyerProfile?.uf ?? '')
    setBuyerCep(detail.buyerProfile?.cep ?? '')
    setBuyerLogradouro(detail.buyerProfile?.logradouro ?? '')
    setBuyerNumero(detail.buyerProfile?.numero ?? '')
    setBuyerBairro(detail.buyerProfile?.bairro ?? '')
    setBuyerComplemento(detail.buyerProfile?.complemento ?? '')
    setStoreName(detail.supplierProfile?.store_name ?? '')
    setServiceCity(detail.supplierProfile?.service_city ?? '')
    setServiceUf(detail.supplierProfile?.service_uf ?? '')
    setServiceRadius(String(detail.supplierProfile?.service_radius_km ?? 50))
  }, [detail])

  const hasChanges = useMemo(() => {
    const profileChanged =
      fullName !== detail.profile.full_name ||
      phone !== (detail.profile.phone ?? '') ||
      email !== (detail.profile.email ?? '')

    const buyerChanged =
      !!detail.buyerProfile &&
      (buyerCity !== (detail.buyerProfile.city ?? '') ||
        buyerUf !== (detail.buyerProfile.uf ?? '') ||
        buyerCep !== (detail.buyerProfile.cep ?? '') ||
        buyerLogradouro !== (detail.buyerProfile.logradouro ?? '') ||
        buyerNumero !== (detail.buyerProfile.numero ?? '') ||
        buyerBairro !== (detail.buyerProfile.bairro ?? '') ||
        buyerComplemento !== (detail.buyerProfile.complemento ?? ''))

    const supplierChanged =
      !!detail.supplierProfile &&
      (storeName !== (detail.supplierProfile.store_name ?? '') ||
        serviceCity !== (detail.supplierProfile.service_city ?? '') ||
        serviceUf !== (detail.supplierProfile.service_uf ?? '') ||
        serviceRadius !== String(detail.supplierProfile.service_radius_km ?? 50))

    return profileChanged || buyerChanged || supplierChanged
  }, [
    detail,
    fullName,
    phone,
    email,
    buyerCity,
    buyerUf,
    buyerCep,
    buyerLogradouro,
    buyerNumero,
    buyerBairro,
    buyerComplemento,
    storeName,
    serviceCity,
    serviceUf,
    serviceRadius,
  ])

  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH
  const canSave = hasChanges && reasonValid && !updateProfile.isPending

  async function handleSave() {
    const changes: AdminUserProfileChanges = {}

    const profileFields: Record<string, string | null> = {}
    if (fullName !== detail.profile.full_name) profileFields.full_name = fullName
    if (phone !== (detail.profile.phone ?? '')) profileFields.phone = phone || null
    if (email !== (detail.profile.email ?? '')) profileFields.email = email || null
    if (Object.keys(profileFields).length > 0) changes.profiles = profileFields

    if (detail.buyerProfile) {
      const buyerFields: Record<string, string | null> = {}
      if (buyerCity !== (detail.buyerProfile.city ?? '')) buyerFields.city = buyerCity || null
      if (buyerUf !== (detail.buyerProfile.uf ?? '')) buyerFields.uf = buyerUf || null
      if (buyerCep !== (detail.buyerProfile.cep ?? '')) buyerFields.cep = buyerCep || null
      if (buyerLogradouro !== (detail.buyerProfile.logradouro ?? ''))
        buyerFields.logradouro = buyerLogradouro || null
      if (buyerNumero !== (detail.buyerProfile.numero ?? '')) buyerFields.numero = buyerNumero || null
      if (buyerBairro !== (detail.buyerProfile.bairro ?? '')) buyerFields.bairro = buyerBairro || null
      if (buyerComplemento !== (detail.buyerProfile.complemento ?? ''))
        buyerFields.complemento = buyerComplemento || null
      if (Object.keys(buyerFields).length > 0) changes.buyer_profiles = buyerFields
    }

    if (detail.supplierProfile) {
      const supplierFields: Record<string, number | string | null> = {}
      if (storeName !== (detail.supplierProfile.store_name ?? ''))
        supplierFields.store_name = storeName || null
      if (serviceCity !== (detail.supplierProfile.service_city ?? ''))
        supplierFields.service_city = serviceCity || null
      if (serviceUf !== (detail.supplierProfile.service_uf ?? ''))
        supplierFields.service_uf = serviceUf || null
      if (serviceRadius !== String(detail.supplierProfile.service_radius_km ?? 50))
        supplierFields.service_radius_km = Number(serviceRadius)
      if (Object.keys(supplierFields).length > 0) changes.supplier_profiles = supplierFields
    }

    try {
      await updateProfile.mutateAsync({
        userId: detail.profile.id,
        changes,
        reason: reason.trim(),
      })
      toast.success('Dados atualizados. O usuário será notificado por e-mail.')
      setReason('')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  async function handleRefreshCnpj() {
    if (!detail.company) return
    try {
      const result = await refreshCnpj.mutateAsync({
        companyId: detail.company.id,
        targetUserId: detail.profile.id,
        reason: cnpjReason.trim(),
      })
      if (result.changes.length === 0) {
        toast.info('CNPJ reconsultado — nenhum dado fiscal alterado na Receita.')
      } else {
        toast.success('Dados fiscais atualizados com base na Receita Federal.')
      }
      setCnpjDialogOpen(false)
      setCnpjReason('')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao reconsultar CNPJ'))
    }
  }

  async function handleRequestDeletion() {
    try {
      const result = await requestDeletion.mutateAsync({
        userId: detail.profile.id,
        reason: deleteReason.trim(),
      })
      setDeleteToken(result.token)
      setDeleteImpact(result.impact)
      setDeleteStep('impact')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function handleConfirmDeletion() {
    if (!deleteToken) return
    try {
      await confirmDeletion.mutateAsync({
        token: deleteToken,
        confirmationPhrase: deletePhrase,
      })
      toast.success('Conta excluída e anonimizada.')
      navigate('/admin/users')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao excluir'))
    }
  }

  return (
    <div className="space-y-6 pb-28">
      <Alert className="border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
        Alterações são registradas em log imutável e o usuário será notificado por e-mail.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {(detail.buyerProfile || detail.roles.includes('buyer')) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço do comprador</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">CEP</label>
              <Input value={buyerCep} onChange={(e) => setBuyerCep(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">UF</label>
              <select
                value={buyerUf}
                onChange={(e) => setBuyerUf(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Logradouro</label>
              <Input value={buyerLogradouro} onChange={(e) => setBuyerLogradouro(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Número</label>
              <Input value={buyerNumero} onChange={(e) => setBuyerNumero(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bairro</label>
              <Input value={buyerBairro} onChange={(e) => setBuyerBairro(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Complemento</label>
              <Input value={buyerComplemento} onChange={(e) => setBuyerComplemento(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {detail.supplierProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Nome da loja</label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade de atendimento</label>
              <Input value={serviceCity} onChange={(e) => setServiceCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">UF de atendimento</label>
              <select
                value={serviceUf}
                onChange={(e) => setServiceUf(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">—</option>
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Raio (km)</label>
              <Input
                type="number"
                min={1}
                value={serviceRadius}
                onChange={(e) => setServiceRadius(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm">
                {detail.supplierProfile.status
                  ? SUPPLIER_STATUS_LABELS[detail.supplierProfile.status as SupplierStatus]
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {detail.company && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Dados fiscais (Receita Federal)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCnpjDialogOpen(true)}
              disabled={refreshCnpj.isPending}
            >
              {refreshCnpj.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reconsultar CNPJ
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Razão social</p>
              <p className="font-medium">{detail.company.razao_social}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CNPJ</p>
              <p className="font-medium">{formatCnpj(detail.company.cnpj)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Nome fantasia</p>
              <p className="font-medium">{detail.company.nome_fantasia ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Situação</p>
              <p className="font-medium">{detail.company.situacao ?? '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Endereço fiscal</p>
              <p className="font-medium">
                {[detail.company.logradouro, detail.company.bairro, detail.company.cidade, detail.company.uf]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </p>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Campos fiscais não podem ser editados manualmente. Use reconsulta à Receita Federal.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Exclusão em duas etapas com confirmação. A conta será anonimizada; pedidos históricos são
            preservados.
          </p>
          <Button variant="destructive" onClick={() => setDeleteStep('confirm')}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 p-4 backdrop-blur md:pl-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Motivo da alteração *</label>
            <textarea
              className={TEXTAREA_CLASS}
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Descreva por que estes dados estão sendo alterados (mín. 10 caracteres)"
              rows={2}
            />
          </div>
          <Button className="shrink-0" disabled={!canSave} onClick={handleSave}>
            {updateProfile.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      </div>

      {cnpjDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-semibold">Reconsultar CNPJ na Receita</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Os dados fiscais serão atualizados com a consulta oficial. Informe o motivo.
            </p>
            <textarea
              className={cn(TEXTAREA_CLASS, 'mt-4')}
              value={cnpjReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCnpjReason(e.target.value)}
              rows={3}
              placeholder="Motivo da reconsulta (mín. 10 caracteres)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCnpjDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={cnpjReason.trim().length < MIN_REASON_LENGTH || refreshCnpj.isPending}
                onClick={handleRefreshCnpj}
              >
                Reconsultar
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteStep === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-semibold text-destructive">Excluir conta — etapa 1</h3>
            <p className="mt-2 text-sm text-muted-foreground">Informe o motivo da exclusão.</p>
            <textarea
              className={cn(TEXTAREA_CLASS, 'mt-4')}
              value={deleteReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeleteReason(e.target.value)}
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteStep('idle')}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteReason.trim().length < MIN_REASON_LENGTH || requestDeletion.isPending}
                onClick={handleRequestDeletion}
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteStep === 'impact' && deleteImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6">
            <h3 className="text-lg font-semibold text-destructive">Excluir conta — etapa 2</h3>
            <ul className="mt-3 space-y-1 text-sm">
              <li>{deleteImpact.demands} solicitação(ões)</li>
              <li>{deleteImpact.offers} proposta(s)</li>
              <li>{deleteImpact.orders} pedido(s)</li>
              {deleteImpact.has_active_subscription && (
                <li className="font-medium text-amber-600">Assinatura ativa vinculada</li>
              )}
            </ul>
            <p className="mt-4 text-sm">
              Digite <strong>{DELETE_PHRASE}</strong> para confirmar:
            </p>
            <Input
              className="mt-2"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteStep('idle')}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deletePhrase.trim().toUpperCase() !== DELETE_PHRASE || confirmDeletion.isPending}
                onClick={handleConfirmDeletion}
              >
                Excluir definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const [accessGranted, setAccessGranted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dados')
  const logAccess = useLogProfileAccess()

  const { data: detail, isLoading, error } = useAdminUserDetail(userId ?? null, accessGranted)
  const { data: activity, isLoading: activityLoading } = useAdminUserActivity(
    userId ?? null,
    accessGranted && activeTab === 'atividade',
  )
  const { data: history = [], isLoading: historyLoading } = useAdminUserHistory(
    userId ?? null,
    accessGranted && activeTab === 'historico',
  )

  useEffect(() => {
    if (accessGranted && userId && activeTab === 'atividade') {
      void logAccess.mutateAsync({ userId, accessType: 'tab_activity' })
    }
  }, [accessGranted, userId, activeTab])

  useEffect(() => {
    if (accessGranted && userId && activeTab === 'historico') {
      void logAccess.mutateAsync({ userId, accessType: 'tab_history' })
    }
  }, [accessGranted, userId, activeTab])

  async function handleAccessConfirm(justification: string) {
    if (!userId) return
    try {
      await logAccess.mutateAsync({
        userId,
        accessType: 'profile_view',
        justification,
      })
      setAccessGranted(true)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao registrar acesso'))
    }
  }

  if (!userId) {
    return <EmptyState icon={User} title="Usuário não encontrado" description="ID inválido." />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <LgpdAccessDialog
        open={!accessGranted}
        loading={logAccess.isPending}
        onConfirm={handleAccessConfirm}
      />

      <div className="mb-4 shrink-0">
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link to="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Usuários
          </Link>
        </Button>

        {accessGranted && isLoading && <LoadingSkeleton className="h-24 w-full rounded-xl" />}

        {accessGranted && error && (
          <Alert className="border-destructive/50 text-destructive">
            Não foi possível carregar os dados do usuário.
          </Alert>
        )}

        {accessGranted && detail && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{detail.profile.full_name}</h1>
              <Badge className={detail.profile.is_active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                {detail.profile.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {detail.profile.email ?? '—'} · ID {detail.profile.id}
            </p>
            <p className="text-sm text-muted-foreground">
              {accountTypeLabel({
                roles: detail.roles,
                has_buyer_profile: !!detail.buyerProfile,
                supplier_status: detail.supplierProfile?.status ?? null,
              })}{' '}
              · Cadastro {formatDateTime(detail.profile.created_at)}
            </p>
          </div>
        )}
      </div>

      {accessGranted && detail && (
        <>
          <div className="mb-4 flex shrink-0 gap-1 border-b">
            {(
              [
                ['dados', 'Dados'],
                ['atividade', 'Atividade'],
                ['historico', 'Histórico'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'dados' && <ProfileFormState detail={detail} />}

            {activeTab === 'atividade' && (
              <div className="space-y-6 pb-6">
                {activityLoading && <LoadingSkeleton className="h-32 w-full" />}
                {activity && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Solicitações</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activity.demands.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-2 pr-4">Título</th>
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2">Data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activity.demands.map((d) => (
                                  <tr key={d.id} className="border-b last:border-0">
                                    <td className="py-2 pr-4">{d.titulo}</td>
                                    <td className="py-2 pr-4">{d.status}</td>
                                    <td className="py-2">{formatDateTime(d.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Propostas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activity.offers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma proposta.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2 pr-4">Valor</th>
                                  <th className="pb-2">Data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activity.offers.map((o) => (
                                  <tr key={o.id} className="border-b last:border-0">
                                    <td className="py-2 pr-4">{o.status}</td>
                                    <td className="py-2 pr-4">
                                      {o.valor.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      })}
                                    </td>
                                    <td className="py-2">{formatDateTime(o.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Pedidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activity.orders.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum pedido.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-2 pr-4">Papel</th>
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2">Data</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activity.orders.map((o) => (
                                  <tr key={`${o.id}-${o.role}`} className="border-b last:border-0">
                                    <td className="py-2 pr-4 capitalize">{o.role}</td>
                                    <td className="py-2 pr-4">{o.status}</td>
                                    <td className="py-2">{formatDateTime(o.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="space-y-4 pb-6">
                {historyLoading && <LoadingSkeleton className="h-32 w-full" />}
                {!historyLoading && history.length === 0 && (
                  <EmptyState icon={History} title="Sem histórico" description="Nenhum registro ainda." />
                )}
                {!historyLoading &&
                  history.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {entry.kind === 'change'
                                ? FIELD_LABELS[entry.field_name ?? ''] ?? entry.detail
                                : ACCESS_TYPE_LABELS[entry.detail] ?? entry.detail}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(entry.created_at)} · {entry.actor_name}
                            </p>
                          </div>
                          <Badge className="border border-border bg-transparent text-muted-foreground">
                            {entry.kind === 'change' ? 'Alteração' : 'Consulta'}
                          </Badge>
                        </div>
                        {entry.kind === 'change' && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {entry.old_value ?? '—'} → {entry.new_value ?? '—'}
                          </p>
                        )}
                        {entry.reason && (
                          <p className="mt-2 text-sm">
                            <span className="font-medium">Motivo:</span> {entry.reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
