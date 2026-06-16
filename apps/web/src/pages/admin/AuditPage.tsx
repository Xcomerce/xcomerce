import { useState } from 'react'
import { RefreshCw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuditLogs } from '@/hooks/use-admin'
import type { AuditLogFilters } from '@/services/admin'

export function AuditPage() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [applied, setApplied] = useState<AuditLogFilters>({ limit: 100 })

  const { data: logs = [], isLoading, refetch } = useAuditLogs(applied)

  function applyFilters() {
    setApplied({
      limit: 100,
      ...(entityType.trim() ? { entity_type: entityType.trim() } : {}),
      ...(action.trim() ? { action: action.trim() } : {}),
    })
  }

  function clearFilters() {
    setEntityType('')
    setAction('')
    setApplied({ limit: 100 })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Input
          id="entity-type"
          placeholder="Tipo de entidade (ex.: supplier_profiles)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="min-w-[200px] flex-1"
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />
        <Input
          id="action"
          placeholder="Ação (ex.: supplier.approved)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="min-w-[200px] flex-1"
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />
        <Button onClick={applyFilters}>Filtrar</Button>
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

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon={Shield}
          title="Nenhum registro"
          description="Ajuste os filtros ou aguarde novas ações na plataforma."
        />
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Data</th>
              <th className="px-4 py-3 text-left font-medium">Ação</th>
              <th className="px-4 py-3 text-left font-medium">Entidade</th>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Ator</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3">{log.entity_type}</td>
                <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs">
                  {log.entity_id ?? '—'}
                </td>
                <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs">
                  {log.actor_id ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
