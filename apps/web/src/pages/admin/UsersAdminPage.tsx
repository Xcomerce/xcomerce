import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  X,
  ShieldCheck,
  Receipt,
  FileText,
  UserX,
  UserCheck,
} from 'lucide-react'
import type { SupplierStatus, UserRole } from '@keve/shared'
import { SUPPLIER_STATUS_LABELS } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useAdminUsers, useUpdateAdminUserActive } from '@/hooks/use-admin'
import { useAuth } from '@/contexts/auth-context'
import type { AdminUser } from '@/services/admin'
import { ROLE_LABELS } from '@/config/navigation'
import { translateSupabaseError } from '@/lib/errors'

const PAGE_SIZE = 10

type RoleFilter = '' | UserRole
type ActiveFilter = '' | 'active' | 'inactive'
type SupplierFilter = '' | SupplierStatus

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Assinatura ativa',
  trialing: 'Em trial',
  past_due: 'Inadimplente',
  canceled: 'Assinatura cancelada',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function isStaffUser(user: AdminUser) {
  return user.roles.some((role) => role === 'admin' || role === 'commercial')
}

function UsersTableColGroup() {
  return (
    <colgroup>
      <col className="w-[32%]" />
      <col className="w-[22%]" />
      <col className="w-[22%]" />
      <col className="w-[14%]" />
      <col className="w-[10%]" />
    </colgroup>
  )
}

function UsersTableHead() {
  return (
    <thead>
      <tr>
        <th className="px-3 py-3 text-left font-medium">Usuário</th>
        <th className="px-3 py-3 text-left font-medium">Papéis</th>
        <th className="px-3 py-3 text-left font-medium">Status</th>
        <th className="px-3 py-3 text-left font-medium">Telefone</th>
        <th className="px-3 py-3 text-right font-medium">Ações</th>
      </tr>
    </thead>
  )
}

function UsersPaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background pt-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function RoleBadges({ roles }: { roles: UserRole[] }) {
  if (roles.length === 0) {
    return <span className="text-xs text-muted-foreground">Sem papel</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} variant="secondary" className="text-xs font-normal">
          {ROLE_LABELS[role]}
        </Badge>
      ))}
    </div>
  )
}

function UserStatusCell({ user }: { user: AdminUser }) {
  return (
    <Badge
      className={
        user.is_active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-transparent text-muted-foreground'
      }
    >
      {user.is_active ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}

function UserDetailDialog({
  user,
  onClose,
  onUserUpdated,
}: {
  user: AdminUser | null
  onClose: () => void
  onUserUpdated: (user: AdminUser) => void
}) {
  const updateUserActive = useUpdateAdminUserActive()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!user) return null

  const showApprovalsLink =
    user.supplier_status === 'pendente' || user.supplier_status === 'em_revisao'

  const nextIsActive = !user.is_active

  function openConfirm() {
    setConfirmOpen(true)
  }

  async function handleConfirmStatusChange() {
    try {
      await updateUserActive.mutateAsync({ userId: user.id, isActive: nextIsActive })
      onUserUpdated({ ...user, is_active: nextIsActive })
      toast.success(nextIsActive ? 'Usuário reativado' : 'Usuário inativado')
      setConfirmOpen(false)
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-title"
          className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-200"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0">
            <h3 id="user-detail-title" className="truncate text-lg font-bold text-foreground">
              {user.full_name}
            </h3>
            <p className="break-all text-sm text-muted-foreground">{user.email ?? '—'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="scrollbar-custom min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Papéis</p>
            <RoleBadges roles={user.roles} />
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium">{user.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conta</dt>
              <dd className="font-medium">{user.is_active ? 'Ativa' : 'Inativa'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cadastro</dt>
              <dd className="font-medium">{formatDateTime(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Última atualização</dt>
              <dd className="font-medium">{formatDateTime(user.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Perfil comprador</dt>
              <dd className="font-medium">{user.has_buyer_profile ? 'Sim' : 'Não'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fornecedor</dt>
              <dd className="font-medium">
                {user.supplier_status
                  ? SUPPLIER_STATUS_LABELS[user.supplier_status]
                  : 'Não cadastrado'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Assinatura</dt>
              <dd className="font-medium">
                {user.subscription_status
                  ? `${SUBSCRIPTION_STATUS_LABELS[user.subscription_status] ?? user.subscription_status}${
                      user.subscription_plan_name ? ` · ${user.subscription_plan_name}` : ''
                    }`
                  : 'Sem assinatura'}
              </dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Atalhos
            </p>
            <div className="flex flex-wrap gap-2">
              {showApprovalsLink && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/approvals">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Aprovações
                  </Link>
                </Button>
              )}
              {user.subscription_status && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/subscriptions">
                    <Receipt className="mr-2 h-4 w-4" />
                    Assinaturas
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/audit">
                  <FileText className="mr-2 h-4 w-4" />
                  Auditoria
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          {user.is_active ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={updateUserActive.isPending}
              onClick={openConfirm}
            >
              <UserX className="mr-2 h-4 w-4" />
              Inativar usuário
            </Button>
          ) : (
            <Button disabled={updateUserActive.isPending} onClick={openConfirm}>
              <UserCheck className="mr-2 h-4 w-4" />
              Reativar usuário
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={updateUserActive.isPending}>
            Fechar
          </Button>
        </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={nextIsActive ? 'Reativar usuário?' : 'Inativar usuário?'}
        description={
          nextIsActive
            ? `${user.full_name} voltará a acessar a plataforma normalmente.`
            : `${user.full_name} não poderá mais acessar a plataforma até ser reativado.`
        }
        confirmLabel={nextIsActive ? 'Reativar' : 'Inativar'}
        variant={nextIsActive ? 'default' : 'destructive'}
        loading={updateUserActive.isPending}
      />
    </>
  )
}

export function UsersAdminPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('')
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const { user: currentUser } = useAuth()
  const { data: users = [], isLoading, refetch } = useAdminUsers()

  const filteredUsers = useMemo(() => {
    let rows = users

    if (currentUser?.id) {
      rows = rows.filter((user) => user.id !== currentUser.id)
    }

    if (roleFilter) {
      rows = rows.filter((user) => user.roles.includes(roleFilter))
    }

    if (activeFilter === 'active') {
      rows = rows.filter((user) => user.is_active)
    } else if (activeFilter === 'inactive') {
      rows = rows.filter((user) => !user.is_active)
    }

    if (supplierFilter) {
      rows = rows.filter((user) => user.supplier_status === supplierFilter)
    }

    const query = search.trim().toLowerCase()
    if (query) {
      rows = rows.filter((user) => {
        const name = user.full_name.toLowerCase()
        const email = user.email?.toLowerCase() ?? ''
        const phone = user.phone?.toLowerCase() ?? ''
        return name.includes(query) || email.includes(query) || phone.includes(query)
      })
    }

    return rows
  }, [users, currentUser?.id, search, roleFilter, activeFilter, supplierFilter])

  const total = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, activeFilter, supplierFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => {
    let buyers = 0
    let suppliers = 0
    let staff = 0
    let inactive = 0

    for (const user of filteredUsers) {
      if (user.roles.includes('buyer') || user.has_buyer_profile) buyers += 1
      if (user.roles.includes('supplier') || user.supplier_status) suppliers += 1
      if (isStaffUser(user)) staff += 1
      if (!user.is_active) inactive += 1
    }

    return { buyers, suppliers, staff, inactive }
  }, [filteredUsers])

  const hasActiveFilters = Boolean(search.trim() || roleFilter || activeFilter || supplierFilter)

  function clearFilters() {
    setSearch('')
    setRoleFilter('')
    setActiveFilter('')
    setSupplierFilter('')
    setPage(1)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <div className="relative z-10 shrink-0 space-y-4">
        {!isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total" value={filteredUsers.length} icon={Users} />
            <StatCard title="Compradores" value={stats.buyers} icon={Users} />
            <StatCard title="Fornecedores" value={stats.suppliers} icon={Users} />
            <StatCard title="Equipe" value={stats.staff} icon={Users} />
            <StatCard title="Inativos" value={stats.inactive} icon={Users} />
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nome, e-mail ou telefone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 w-40 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Papel"
          >
            <option value="">Todos os papéis</option>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            className="h-10 w-36 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Conta"
          >
            <option value="">Todas as contas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value as SupplierFilter)}
            className="h-10 w-44 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Status fornecedor"
          >
            <option value="">Fornecedor (todos)</option>
            {(Object.keys(SUPPLIER_STATUS_LABELS) as SupplierStatus[]).map((status) => (
              <option key={status} value={status}>
                {SUPPLIER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={clearFilters}>
            Limpar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            title="Atualizar"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        {isLoading && (
          <div className="space-y-2 overflow-y-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="overflow-y-auto">
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? 'Nenhum resultado' : 'Nenhum usuário'}
              description={
                hasActiveFilters
                  ? 'Ajuste os filtros para encontrar usuários.'
                  : 'Aguarde novos cadastros na plataforma.'
              }
            />
          </div>
        )}

        {!isLoading && filteredUsers.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
            <div className="shrink-0 border-b bg-muted [scrollbar-gutter:stable]">
              <table className="w-full table-fixed text-sm">
                <UsersTableColGroup />
                <UsersTableHead />
              </table>
            </div>
            <div className="scrollbar-custom min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 [scrollbar-gutter:stable]">
              <table className="w-full table-fixed text-sm">
                <UsersTableColGroup />
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="break-all text-xs text-muted-foreground">
                          {user.email ?? '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <RoleBadges roles={user.roles} />
                      </td>
                      <td className="px-3 py-3">
                        <UserStatusCell user={user} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {user.phone ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          title="Ver detalhes"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!isLoading && total > 0 && (
        <UsersPaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={(updated) => setSelectedUser(updated)}
      />
    </div>
  )
}
