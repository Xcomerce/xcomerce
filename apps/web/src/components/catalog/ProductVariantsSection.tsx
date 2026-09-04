import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useFormContext } from 'react-hook-form'
import { ImagePlus, Info, Plus, Trash2, X } from 'lucide-react'
import {
  COMBINATION_BLOCK_THRESHOLD,
  COMBINATION_PAGINATION_THRESHOLD,
  COMBINATION_PAGE_SIZE,
  COMBINATION_WARN_THRESHOLD,
  MAX_OPTIONS_PER_AXIS,
  MAX_VARIANT_AXES,
  type ProductInput,
  type ProductVariantStockRow,
  type VariantAxis,
  countCombinations,
  formatCombinationCount,
  normalizeVariantAxes,
  normalizeVariantValue,
  syncVariantStockRows,
  variantStockKeyFromValues,
  wouldExceedCombinationLimit,
} from '@keve/shared'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { VariantValueAutocomplete } from '@/components/catalog/VariantValueAutocomplete'
import { getColorHex, isLightColor } from '@/pages/supplier/product-form/utils'
import { cn } from '@/lib/utils'

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

type PendingProductImage = {
  id: string
  file: File
  preview: string
}

type ProductVariantsSectionProps = {
  categoryId?: string
  savedImageUrls: string[]
  pendingImages: PendingProductImage[]
  totalImages: number
  maxImages: number
  onAddImages: (files: File[]) => void
  onRemoveSavedImage: (url: string) => void
  onRemovePendingImage: (id: string) => void
}

function CombinationStockTable({
  rows,
  axisNames,
  page,
  onPageChange,
  onChange,
  bulkPrice,
  bulkStock,
  onBulkPriceChange,
  onBulkStockChange,
  onApplyPriceAll,
  onApplyStockAll,
  allUnlimited,
  onToggleUnlimitedAll,
}: {
  rows: ProductVariantStockRow[]
  axisNames: string[]
  page: number
  onPageChange: (page: number) => void
  onChange: (rows: ProductVariantStockRow[]) => void
  bulkPrice: string
  bulkStock: string
  onBulkPriceChange: (v: string) => void
  onBulkStockChange: (v: string) => void
  onApplyPriceAll: () => void
  onApplyStockAll: () => void
  allUnlimited: boolean
  onToggleUnlimitedAll: () => void
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / COMBINATION_PAGE_SIZE))
  const paginated = rows.length > COMBINATION_PAGINATION_THRESHOLD
  const visibleRows = paginated
    ? rows.slice(page * COMBINATION_PAGE_SIZE, (page + 1) * COMBINATION_PAGE_SIZE)
    : rows
  const startIndex = paginated ? page * COMBINATION_PAGE_SIZE : 0

  function updateRow(index: number, patch: Partial<ProductVariantStockRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="Preço"
            value={bulkPrice}
            onChange={(e) => onBulkPriceChange(e.target.value)}
            className="h-8 w-24"
          />
          <Button type="button" size="sm" variant="outline" onClick={onApplyPriceAll}>
            Aplicar preço para todas
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Estoque"
            value={bulkStock}
            onChange={(e) => onBulkStockChange(e.target.value)}
            className="h-8 w-24"
          />
          <Button type="button" size="sm" variant="outline" onClick={onApplyStockAll}>
            Aplicar estoque para todas
          </Button>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onToggleUnlimitedAll}>
          {allUnlimited ? 'Remover ilimitado de todas' : 'Estoque ilimitado para todas'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
              {axisNames.map((name) => (
                <th key={name} className="px-3 py-2 font-medium">
                  {name}
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Preço (R$)</th>
              <th className="px-3 py-2 font-medium">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, localIndex) => {
              const index = startIndex + localIndex
              return (
                <tr key={variantStockKeyFromValues(row.values ?? {})} className="border-b border-border/40 last:border-0">
                  {axisNames.map((name) => (
                    <td key={name} className="px-3 py-2 font-medium">
                      {row.values?.[name] ?? '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Input
                      value={row.sku ?? ''}
                      onChange={(e) => updateRow(index, { sku: e.target.value || null })}
                      className="h-8 min-w-[80px]"
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.preco ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        updateRow(index, { preco: raw === '' ? null : Math.max(0, Number.parseFloat(raw)) })
                      }}
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        disabled={row.ilimitado}
                        value={row.ilimitado ? '' : (row.quantidade ?? '')}
                        onChange={(e) => {
                          const raw = e.target.value
                          updateRow(index, {
                            quantidade: raw === '' ? null : Math.max(0, Number.parseInt(raw, 10)),
                            ilimitado: false,
                          })
                        }}
                        className="h-8 w-20"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={row.ilimitado ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => toggleUnlimited(index)}
                      >
                        Ilimitado
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {paginated ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {page + 1} de {totalPages} ({rows.length} combinações)
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ProductVariantsSection({
  categoryId,
  savedImageUrls,
  pendingImages,
  totalImages,
  maxImages,
  onAddImages,
  onRemoveSavedImage: _onRemoveSavedImage,
  onRemovePendingImage: _onRemovePendingImage,
}: ProductVariantsSectionProps) {
  const form = useFormContext<ProductInput>()
  const variantAxes = (form.watch('variant_axes') ?? []) as VariantAxis[]
  const estoqueVariacoes = form.watch('estoque_variacoes') ?? []
  const category_id = categoryId ?? form.watch('category_id')

  const [optionDrafts, setOptionDrafts] = useState<Record<number, string>>({})
  const [selectedVisualOption, setSelectedVisualOption] = useState<string | null>(null)
  const [comboPage, setComboPage] = useState(0)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const optionInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const axes = useMemo(() => normalizeVariantAxes(variantAxes), [variantAxes])
  const comboCount = countCombinations(axes)
  const visualAxis = axes[0]
  const visualAxisName = visualAxis?.name ?? 'Variação'
  const activeVisualOption =
    selectedVisualOption && visualAxis?.options.includes(selectedVisualOption)
      ? selectedVisualOption
      : visualAxis?.options[0] ?? null

  const axisNames = axes.map((a) => a.name)

  useEffect(() => {
    const next = syncVariantStockRows(axes, estoqueVariacoes as ProductVariantStockRow[])
    const currentKeys = (estoqueVariacoes as ProductVariantStockRow[])
      .map((r) => variantStockKeyFromValues(r.values ?? {}))
      .join(',')
    const nextKeys = next.map((r) => variantStockKeyFromValues(r.values ?? {})).join(',')
    if (currentKeys !== nextKeys) {
      form.setValue('estoque_variacoes', next, { shouldValidate: true })
    }
  }, [axes, estoqueVariacoes, form])

  function setAxes(next: VariantAxis[]) {
    form.setValue('variant_axes', normalizeVariantAxes(next), { shouldValidate: true, shouldDirty: true })
    const legacy = {
      tem_cor: next.some((a) => ['cor', 'cores'].includes(normalizeVariantValue(a.name)) && a.options.length > 0),
      tem_tamanho: next.some(
        (a) => ['tamanho', 'tamanhos', 'numeracao', 'numeração'].includes(normalizeVariantValue(a.name)) && a.options.length > 0,
      ),
    }
    form.setValue('tem_cor', legacy.tem_cor, { shouldValidate: true })
    form.setValue('tem_tamanho', legacy.tem_tamanho, { shouldValidate: true })
    const corAxis = next.find((a) => ['cor', 'cores'].includes(normalizeVariantValue(a.name)))
    const sizeAxis = next.find((a) =>
      ['tamanho', 'tamanhos', 'numeracao', 'numeração'].includes(normalizeVariantValue(a.name)),
    )
    form.setValue('cores', corAxis?.options ?? [], { shouldValidate: true })
    form.setValue('tamanhos', sizeAxis?.options ?? [], { shouldValidate: true })
  }

  function addAxis() {
    if (axes.length >= MAX_VARIANT_AXES) return
    setAxes([...axes, { name: '', options: [], images: {} }])
  }

  function removeAxis(index: number) {
    setAxes(axes.filter((_, i) => i !== index))
  }

  function updateAxisName(index: number, name: string) {
    const next = axes.map((axis, i) => (i === index ? { ...axis, name } : axis))
    setAxes(next)
  }

  function addOption(axisIndex: number) {
    const draft = optionDrafts[axisIndex]?.trim() ?? ''
    if (!draft) return
    const axis = axes[axisIndex]
    if (!axis) return
    if (axis.options.some((o) => normalizeVariantValue(o) === normalizeVariantValue(draft))) {
      setOptionDrafts((prev) => ({ ...prev, [axisIndex]: '' }))
      return
    }
    if (wouldExceedCombinationLimit(axes, axisIndex)) return
    if (axis.options.length >= MAX_OPTIONS_PER_AXIS) return

    const next = axes.map((a, i) =>
      i === axisIndex ? { ...a, options: [...a.options, draft] } : a,
    )
    setAxes(next)
    setOptionDrafts((prev) => ({ ...prev, [axisIndex]: '' }))
    optionInputRefs.current[axisIndex]?.focus()
  }

  function removeOption(axisIndex: number, option: string) {
    const next = axes.map((a, i) =>
      i === axisIndex ? { ...a, options: a.options.filter((o) => o !== option) } : a,
    )
    setAxes(next)
  }

  function handleImageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    onAddImages(Array.from(e.dataTransfer.files))
  }

  const allUnlimited = (estoqueVariacoes as ProductVariantStockRow[]).every((r) => r.ilimitado)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {comboCount > 0 ? formatCombinationCount(axes) : 'Sem combinações'}
        </p>
        {axes.length < MAX_VARIANT_AXES ? (
          <Button type="button" size="sm" variant="outline" onClick={addAxis}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar tipo de variação
          </Button>
        ) : null}
      </div>

      {comboCount >= COMBINATION_WARN_THRESHOLD && comboCount <= COMBINATION_BLOCK_THRESHOLD ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <Info className="h-4 w-4" />
          <p className="text-xs">
            {comboCount} combinações — considere separar em produtos distintos para facilitar a gestão.
          </p>
        </Alert>
      ) : null}

      {axes.map((axis, axisIndex) => (
        <div key={axisIndex} className="space-y-3 rounded-xl border border-border/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={axis.name}
              onChange={(e) => updateAxisName(axisIndex, e.target.value)}
              placeholder="Nome da variação (Cor, Tamanho, Voltagem...)"
              className="max-w-xs font-medium"
            />
            {axes.length > 1 ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => removeAxis(axisIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {axis.options.map((option) => (
              <span
                key={option}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-sm"
              >
                {axisIndex === 0 ? (
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: getColorHex(option) }}
                  />
                ) : null}
                {option}
                <button type="button" onClick={() => removeOption(axisIndex, option)} aria-label={`Remover ${option}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <VariantValueAutocomplete
              inputRef={(el) => {
                optionInputRefs.current[axisIndex] = el
              }}
              value={optionDrafts[axisIndex] ?? ''}
              onChange={(v) => setOptionDrafts((prev) => ({ ...prev, [axisIndex]: v }))}
              categoryId={category_id}
              axisName={axis.name || 'Cor'}
              side="supplier"
              colorAxis={['cor', 'cores'].includes(normalizeVariantValue(axis.name))}
              placeholder={`Nova opção de ${axis.name || 'variação'}`}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addOption(axisIndex)
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => addOption(axisIndex)}>
              Adicionar
            </Button>
          </div>
        </div>
      ))}

      {axes.length === 0 ? (
        <Button type="button" variant="outline" onClick={addAxis}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar variação
        </Button>
      ) : null}

      {visualAxis && visualAxis.options.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Imagens de {visualAxisName.toLowerCase()}</p>
          <div className="flex flex-wrap gap-2">
            {visualAxis.options.map((option) => {
              const hex = getColorHex(option)
              const isActive = activeVisualOption === option
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                    isActive ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                  onClick={() => setSelectedVisualOption(option)}
                >
                  <span
                    className={cn('h-4 w-4 rounded-full border', isLightColor(hex) ? 'border-border' : 'border-transparent')}
                    style={{ backgroundColor: hex }}
                  />
                  {option}
                </button>
              )
            })}
          </div>

          <div
            className="relative max-w-[200px] overflow-hidden rounded-xl border border-dashed"
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="aspect-square bg-muted/30">
              {pendingImages[0]?.preview ?? savedImageUrls[0] ? (
                <img
                  src={pendingImages[0]?.preview ?? savedImageUrls[0] ?? ''}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
            </div>
            {totalImages < maxImages ? (
              <label className="flex cursor-pointer justify-center border-t py-2 text-xs text-primary">
                <input
                  type="file"
                  accept={PRODUCT_IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onAddImages(Array.from(e.target.files ?? []))
                    e.target.value = ''
                  }}
                />
                Trocar imagem de {activeVisualOption ?? visualAxisName}
              </label>
            ) : null}
          </div>
        </div>
      ) : null}

      {comboCount > 0 ? (
        <FormField
          control={form.control}
          name="estoque_variacoes"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <CombinationStockTable
                  rows={(field.value ?? []) as ProductVariantStockRow[]}
                  axisNames={axisNames}
                  page={comboPage}
                  onPageChange={setComboPage}
                  onChange={field.onChange}
                  bulkPrice={bulkPrice}
                  bulkStock={bulkStock}
                  onBulkPriceChange={setBulkPrice}
                  onBulkStockChange={setBulkStock}
                  allUnlimited={allUnlimited}
                  onApplyPriceAll={() => {
                    const price = bulkPrice === '' ? null : Math.max(0, Number.parseFloat(bulkPrice))
                    field.onChange(
                      ((field.value ?? []) as ProductVariantStockRow[]).map((row) => ({ ...row, preco: price })),
                    )
                  }}
                  onApplyStockAll={() => {
                    const qty = bulkStock === '' ? null : Math.max(0, Number.parseInt(bulkStock, 10))
                    field.onChange(
                      ((field.value ?? []) as ProductVariantStockRow[]).map((row) => ({
                        ...row,
                        quantidade: qty,
                        ilimitado: false,
                      })),
                    )
                  }}
                  onToggleUnlimitedAll={() => {
                    const nextUnlimited = !allUnlimited
                    field.onChange(
                      ((field.value ?? []) as ProductVariantStockRow[]).map((row) => ({
                        ...row,
                        ilimitado: nextUnlimited,
                        quantidade: nextUnlimited ? null : row.quantidade,
                      })),
                    )
                  }}
                />
              </FormControl>
              {fieldState.error ? <FormMessage /> : null}
            </FormItem>
          )}
        />
      ) : null}
    </div>
  )
}
