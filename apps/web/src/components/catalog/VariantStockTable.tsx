import {
  buildVariantStockMatrix,
  formatVariantStockLabel,
  type ProductVariantStockRow,
} from '@keve/shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type VariantStockTableProps = {
  rows: ProductVariantStockRow[]
  onChange: (rows: ProductVariantStockRow[]) => void
  error?: string
}

export function VariantStockTable({ rows, onChange, error }: VariantStockTableProps) {
  if (rows.length === 0) return null

  function updateRow(index: number, patch: Partial<ProductVariantStockRow>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  function toggleUnlimited(index: number) {
    const row = rows[index]
    if (row.ilimitado) {
      updateRow(index, { ilimitado: false, quantidade: row.quantidade ?? 0 })
    } else {
      updateRow(index, { ilimitado: true, quantidade: null })
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">Estoque por variação</p>
        <p className="text-xs text-muted-foreground">
          Informe a quantidade disponível ou marque como ilimitado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Variação</th>
              <th className="px-3 py-2 font-medium">Quantidade</th>
              <th className="px-3 py-2 font-medium text-right">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.cor ?? ''}|${row.tamanho ?? ''}`} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 font-medium text-foreground">{formatVariantStockLabel(row)}</td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    disabled={row.ilimitado}
                    placeholder={row.ilimitado ? '—' : '0'}
                    value={row.ilimitado ? '' : row.quantidade ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        updateRow(index, { quantidade: null, ilimitado: false })
                        return
                      }
                      const parsed = Number.parseInt(raw, 10)
                      if (Number.isNaN(parsed)) return
                      updateRow(index, { quantidade: Math.max(0, parsed), ilimitado: false })
                    }}
                    className="h-9 max-w-[120px]"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={row.ilimitado ? 'default' : 'outline'}
                    className="h-8 rounded-lg text-xs"
                    onClick={() => toggleUnlimited(index)}
                  >
                    Ilimitado
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function syncVariantStockRows(
  temCor: boolean,
  temTamanho: boolean,
  cores: string[],
  tamanhos: string[],
  current: ProductVariantStockRow[],
): ProductVariantStockRow[] {
  if (!temCor && !temTamanho) return []

  const hasCorOptions = !temCor || cores.length > 0
  const hasTamanhoOptions = !temTamanho || tamanhos.length > 0
  if (!hasCorOptions || !hasTamanhoOptions) return []

  return buildVariantStockMatrix(
    temCor,
    temTamanho,
    temCor ? cores : [],
    temTamanho ? tamanhos : [],
    current,
  )
}
