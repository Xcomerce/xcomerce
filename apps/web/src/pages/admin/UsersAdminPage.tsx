import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import type { SupplierStatus, UserRole } from '@keve/shared'
import { SUPPLIER_STATUS_LABELS } from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAdminUserSearch } from '@/hooks/use-admin'
import { accountTypeLabel, type AdminUserSearchResult } from '@/services/admin-user-profile'
import { ROLE_LABELS } from '@/config/navigation'

const PAGE_SIZE = 20

type RoleFilter = '' | UserRole
type ActiveFilter = '' | 'active' | 'inactive'
type SupplierFilter = '' | SupplierStatus

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function UsersTableColGroup() {
  return (
    <colgroup>
      <col className="w-[28%]" />
      <col className="w-[18%]" />
      <col className="w-[18%]" />
      <col className="w-[14%]" />
      <col className="w-[12%]" />
      <col className="w-[10%]" />
    </colgroup>
  )
}

function UsersTableHead() {
  return (
    <thead>
      <tr>
        <th className="px-3 py-3 text-left font-medium">Usuário</th>
        <th className="px-3 py-3 text-left font-medium">Tipo de conta</th>
        <th className="px-3 py-3 text-left font-medium">Situação</th>
        <th className="px-3 py-3 text-left font-medium">Telefone</th>
        <th className="px-3 py-3 text-left font-medium">Cadastro</th>
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
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background pt-3">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
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

function AccountTypeBadges({ user }: { user: AdminUserSearchResult }) {
  const label = accountTypeLabel(user)
  return (
    <Badge className="border-transparent bg-secondary text-secondary-foreground text-xs font-normal">
      {label}
    </Badge>
  )
}

function UserStatusCell({ user }: { user: AdminUserSearchResult }) {
  return (
    <div className="space-y-1">
      <Badge
        className={
          user.is_active
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-transparent text-muted-foreground'
        }
      >
        {user.is_active ? 'Ativo' : 'Inativo'}
      </Badge>
      {user.supplier_status && (
        <p className="text-xs text-muted-foreground">
          {SUPPLIER_STATUS_LABELS[user.supplier_status]}
        </p>
      )}
    </div>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function UsersAdminPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('')
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search, 300)
  const { data, isLoading, isFetching, refetch } = useAdminUserSearch(debouncedSearch, page)

  const rows = data?.rows ?? []
  const total = data?.total ?? 0

  const filteredRows = useMemo(() => {
    let result = rows

    if (roleFilter) {
      result = result.filter((user) => user.roles.includes(roleFilter))
    }

    if (activeFilter === 'active') {
      result = result.filter((user) => user.is_active)
    } else if (activeFilter === 'inactive') {
      result = result.filter((user) => !user.is_active)
    }

    if (supplierFilter) {
      result = result.filter((user) => user.supplier_status === supplierFilter)
    }

    return result
  }, [rows, roleFilter, activeFilter, supplierFilter])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, roleFilter, activeFilter, supplierFilter])

  const stats = useMemo(() => {
    let buyers = 0
    let suppliers = 0
    let inactive = 0

    for (const user of filteredRows) {
      if (user.roles.includes('buyer') || user.has_buyer_profile) buyers += 1
      if (user.roles.includes('supplier') || user.supplier_status) suppliers += 1
      if (!user.is_active) inactive += 1
    }

    return { buyers, suppliers, inactive }
  }, [filteredRows])

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Resultados" value={total} icon={Users} />
            <StatCard title="Compradores (página)" value={stats.buyers} icon={Users} />
            <StatCard title="Fornecedores (página)" value={stats.suppliers} icon={Users} />
            <StatCard title="Inativos (página)" value={stats.inactive} icon={Users} />
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nome, e-mail, telefone, CNPJ ou ID"
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
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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

        {!isLoading && filteredRows.length === 0 && (
          <div className="overflow-y-auto">
            <EmptyState
              icon={Users}
              title={hasActiveFilters ? 'Nenhum resultado' : 'Nenhum usuário'}
              description={
                hasActiveFilters
                  ? 'Ajuste os filtros ou tente outro termo de busca.'
                  : 'Aguarde novos cadastros na plataforma.'
              }
            />
          </div>
        )}

        {!isLoading && filteredRows.length > 0 && (
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
                  {filteredRows.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="break-all text-xs text-muted-foreground">{user.email ?? '—'}</p>
                        {user.cnpj && (
                          <p className="text-xs text-muted-foreground">CNPJ {user.cnpj}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <AccountTypeBadges user={user} />
                      </td>
                      <td className="px-3 py-3">
                        <UserStatusCell user={user} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {user.phone ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs">
                        {formatDateTime(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/admin/users/${user.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir ficha
                          </Link>
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
    </div>
  )
}
