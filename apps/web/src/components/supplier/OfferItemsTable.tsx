import { groupDemandSpecificationsByColor, type DemandVariantFields } from '@keve/shared'
import { cn } from '@/lib/utils'
import type { OfferLineItem } from '@/lib/offer-variant-pricing'
import { roundCurrency, sumOfferLineQuantity, sumOfferLineTotal } from '@/lib/offer-variant-pricing'
import { UnitPriceInput } from '@/components/supplier/UnitPriceInput'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

type OfferItemsTableProps = {
  demand: DemandVariantFields
  items: OfferLineItem[]
  unidade?: string
  readOnly?: boolean
  onChange?: (items: OfferLineItem[]) => void
  className?: string
}

export function OfferItemsTable({
  demand,
  items,
  unidade = 'un',
  readOnly = false,
  onChange,
  className,
}: OfferItemsTableProps) {
  const totalQuantity = sumOfferLineQuantity(items)
  const totalValue = roundCurrency(sumOfferLineTotal(items))
  const hasVariants = items.some((item) => item.cor || item.tamanho)

  const displayGroups = (() => {
    if (!hasVariants) return [{ cor: '', items }]

    const groups: { cor: string; items: OfferLineItem[] }[] = []
    for (const item of items) {
      const cor = item.cor.trim()
      const last = groups[groups.length - 1]
      if (last && last.cor === cor) {
        last.items.push(item)
      } else {
        groups.push({ cor, items: [item] })
      }
    }
    return groups
  })()

  function updateUnitPrice(key: string, precoUnitario: number) {
    if (readOnly || !onChange) return

    onChange(
      items.map((item) => (item.key === key ? { ...item, precoUnitario } : item)),
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-foreground">Itens solicitados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Revise os itens e ajuste os preços unitários, se necessário.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                {hasVariants ? (
                  <>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Cor
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Tamanho
                    </th>
                  </>
                ) : null}
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quantidade solicitada
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="block">Preço unitário (R$)</span>
                  {!readOnly ? (
                    <span className="mt-0.5 block text-[10px] font-normal normal-case text-muted-foreground">
                      digite só números — centavos entram automaticamente
                    </span>
                  ) : null}
                </th>
                <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total (R$)
                  <span className="ml-1 font-normal normal-case text-muted-foreground">(cálculo automático)</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {displayGroups.map((group) =>
                group.items.map((item, itemIndex) => {
                  const rowTotal = roundCurrency(item.quantidade * item.precoUnitario)

                  return (
                    <tr key={item.key}>
                      {hasVariants ? (
                        <>
                          {itemIndex === 0 ? (
                            <td
                              rowSpan={group.items.length}
                              className="px-3 py-3 align-top font-semibold uppercase text-foreground"
                            >
                              {group.cor || '—'}
                            </td>
                          ) : null}
                          <td className="px-3 py-3 font-medium uppercase">{item.tamanho || '—'}</td>
                        </>
                      ) : null}
                      <td className="px-3 py-3 font-medium">
                        {item.quantidade} {unidade}
                      </td>
                      <td className="px-3 py-3">
                        {readOnly ? (
                          <span className="font-medium">{formatCurrency(item.precoUnitario)}</span>
                        ) : (
                          <UnitPriceInput
                            value={item.precoUnitario}
                            onChange={(precoUnitario) => updateUnitPrice(item.key, precoUnitario)}
                            className="h-9 rounded-lg"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">{formatCurrency(rowTotal)}</td>
                    </tr>
                  )
                }),
              )}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5">
                <td
                  colSpan={hasVariants ? 2 : 1}
                  className="px-3 py-3 text-sm font-bold uppercase text-foreground"
                >
                  Total geral
                </td>
                <td className="px-3 py-3 text-sm font-bold text-foreground">
                  {totalQuantity} {unidade}
                </td>
                {hasVariants ? <td className="px-3 py-3" /> : null}
                <td
                  colSpan={hasVariants ? 1 : 2}
                  className="px-3 py-3 text-sm font-bold text-primary"
                >
                  {formatCurrency(totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export function OfferProposalSummary({
  totalQuantity,
  totalValue,
  unidade = 'un',
  className,
}: {
  totalQuantity: number
  totalValue: number
  unidade?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border/70 bg-muted/20 p-4', className)}>
      <p className="text-sm font-semibold text-foreground">Resumo da proposta</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Total de peças</dt>
          <dd className="font-semibold text-foreground">
            {totalQuantity} {unidade}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Total da proposta</dt>
          <dd className="text-lg font-bold text-primary">
            {formatCurrency(roundCurrency(totalValue))}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">(Valores calculados automaticamente)</p>
    </div>
  )
}
