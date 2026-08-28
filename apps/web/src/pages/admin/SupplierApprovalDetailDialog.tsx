import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useSupplierApprovalDetails } from '@/hooks/use-admin'
import { getSignedUrl } from '@/lib/storage'
import { translateSupabaseError } from '@/lib/errors'
import { SUPPLIER_STATUS_LABELS } from '@keve/shared'
import type { PendingSupplier } from '@/services/admin'
import type { Tables } from '@keve/shared'

const DOCUMENT_TYPE_LABELS: Record<Tables<'documents'>['document_type'], string> = {
  cnpj_card: 'Cartão CNPJ',
  address_proof: 'Comprovante de endereço',
  other: 'Outro documento',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return value
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatCep(value: string | null | undefined) {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

function formatAddress(
  company:
    | Pick<Tables<'companies'>, 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'uf' | 'cep'>
    | Pick<Tables<'companies'>, 'cidade' | 'uf'>
    | null
    | undefined,
) {
  if (!company) return '—'
  const parts = [
    'logradouro' in company
      ? [company.logradouro, company.numero].filter(Boolean).join(', ')
      : null,
    'bairro' in company ? company.bairro : null,
    [company.cidade, company.uf].filter(Boolean).join('/'),
    'cep' in company && company.cep ? `CEP ${formatCep(company.cep)}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

function getCompanySituacao(
  company: Tables<'companies'> | PendingSupplier['companies'] | null | undefined,
): string {
  if (!company || !('situacao' in company)) return '—'
  return company.situacao ?? '—'
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">{children}</dl>
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={typeof value === 'string' && value.length > 40 ? 'sm:col-span-2' : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  )
}

function DocumentLinks({ documents }: { documents: Tables<'documents'>[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUrls() {
      setLoading(true)
      setError(null)
      try {
        const entries = await Promise.all(
          documents.map(async (doc) => {
            const url = await getSignedUrl('documents', doc.storage_path)
            return [doc.id, url] as const
          }),
        )
        if (!cancelled) {
          setUrls(Object.fromEntries(entries))
        }
      } catch (err) {
        if (!cancelled) {
          setError(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao carregar documentos'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (documents.length === 0) {
      setLoading(false)
      return
    }

    loadUrls()
    return () => {
      cancelled = true
    }
  }, [documents])

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando documentos...
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.document_type]}</p>
            <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
          </div>
          {urls[doc.id] ? (
            <Button variant="outline" size="sm" asChild>
              <a href={urls[doc.id]} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />
                Abrir
              </a>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Indisponível</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SupplierApprovalDetailDialog({
  supplier,
  onClose,
}: {
  supplier: PendingSupplier | null
  onClose: () => void
}) {
  const userId = supplier?.user_id ?? null
  const { data, isLoading, error } = useSupplierApprovalDetails(userId)

  if (!supplier) return null

  const company = data?.profile.companies ?? supplier.companies
  const profile = data?.profile.profiles ?? supplier.profiles

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-approval-detail-title"
        className="flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0">
            <h3 id="supplier-approval-detail-title" className="truncate text-lg font-bold text-foreground">
              {profile?.full_name ?? 'Fornecedor'}
            </h3>
            <p className="break-all text-sm text-muted-foreground">{profile?.email ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={supplier.status} kind="supplier" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="scrollbar-custom min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando cadastro...
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {translateSupabaseError(error instanceof Error ? error.message : 'Erro ao carregar detalhes')}
            </p>
          )}

          {data && (
            <>
              <DetailSection title="Responsável">
                <DetailGrid>
                  <DetailItem label="Nome" value={profile?.full_name ?? '—'} />
                  <DetailItem label="E-mail" value={profile?.email ?? '—'} />
                  <DetailItem label="Telefone" value={profile?.phone ?? '—'} />
                  <DetailItem
                    label="Status"
                    value={SUPPLIER_STATUS_LABELS[data.profile.status] ?? data.profile.status}
                  />
                  {data.profile.rejection_reason && (
                    <DetailItem label="Motivo da recusa anterior" value={data.profile.rejection_reason} />
                  )}
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Empresa">
                <DetailGrid>
                  <DetailItem label="Razão social" value={company?.razao_social ?? '—'} />
                  <DetailItem label="Nome fantasia" value={company?.nome_fantasia ?? '—'} />
                  <DetailItem label="Nome da loja" value={data.profile.store_name ?? '—'} />
                  <DetailItem label="CNPJ" value={company?.cnpj ? formatCnpj(company.cnpj) : '—'} />
                  <DetailItem label="Situação cadastral" value={getCompanySituacao(company)} />
                  <DetailItem label="Endereço" value={formatAddress(company)} />
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Área de atuação">
                <DetailGrid>
                  <DetailItem label="Cidade" value={data.profile.service_city ?? '—'} />
                  <DetailItem label="UF" value={data.profile.service_uf ?? '—'} />
                  <DetailItem
                    label="Raio de atendimento"
                    value={
                      data.profile.service_radius_km != null
                        ? `${data.profile.service_radius_km} km`
                        : '—'
                    }
                  />
                </DetailGrid>
              </DetailSection>

              <DetailSection title="Categorias">
                {data.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.categories.map((category) => (
                      <Badge key={category.id} className="border-transparent bg-secondary text-secondary-foreground">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria selecionada.</p>
                )}
              </DetailSection>

              <DetailSection title="Documentos">
                <DocumentLinks documents={data.documents} />
              </DetailSection>

              <DetailSection title="Histórico">
                <DetailGrid>
                  <DetailItem label="Enviado para revisão em" value={formatDateTime(data.profile.updated_at)} />
                  <DetailItem label="Verificado em" value={formatDateTime(data.profile.verified_at)} />
                </DetailGrid>
              </DetailSection>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
