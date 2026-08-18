import {
  groupDemandSpecificationsByColor,
  type DemandVariantFields,
} from '@keve/shared'
import { cn } from '@/lib/utils'

type DemandSpecificationsTableProps = {
  demand: DemandVariantFields
  unidade?: string
  className?: string
  sizeLabel?: string
}

export function DemandSpecificationsTable({
  demand,
  unidade = 'un',
  className,
  sizeLabel = 'Tamanho',
}: DemandSpecificationsTableProps) {
  const groups = groupDemandSpecificationsByColor(demand)
  if (groups.length === 0) return null

  const hasColor = groups.some((group) => group.cor)
  const hasSize = groups.some((group) => group.items.some((item) => item.tamanho))

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/70', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              {hasColor ? (
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Cor
                </th>
              ) : null}
              {hasSize ? (
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {sizeLabel}
                </th>
              ) : null}
              <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quantidade ({unidade})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-card">
            {groups.map((group) =>
              group.items.map((item, itemIndex) => (
                <tr key={`${group.cor}-${item.tamanho}-${itemIndex}`}>
                  {hasColor ? (
                    itemIndex === 0 ? (
                      <td
                        rowSpan={group.items.length}
                        className="px-3 py-3 align-top font-semibold uppercase text-foreground"
                      >
                        {group.cor || '—'}
                      </td>
                    ) : null
                  ) : null}
                  {hasSize ? (
                    <td className="px-3 py-3 font-medium uppercase text-foreground">
                      {item.tamanho || '—'}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 font-medium text-foreground">
                    {Math.max(1, item.quantidade ?? 1)} {unidade}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
