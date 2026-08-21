import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  GripVertical,
  ImagePlus,
  Info,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  PRODUCT_SIZE_TYPE_LABELS,
  type ProductInput,
  type ProductSizeType,
  type ProductVariantStockRow,
} from '@keve/shared'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { VariantOptionsInput } from '@/components/catalog/VariantOptionsInput'
import { ShoeSizePicker } from '@/components/catalog/ShoeSizePicker'
import { ClothingSizePicker } from '@/components/catalog/ClothingSizePicker'
import { syncVariantStockRows } from '@/components/catalog/VariantStockTable'
import { getColorHex, isLightColor } from '@/pages/supplier/product-form/utils'
import { cn } from '@/lib/utils'

const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

type PendingProductImage = {
  id: string
  file: File
  preview: string
}

type ProductVariantsSectionProps = {
  savedImageUrls: string[]
  pendingImages: PendingProductImage[]
  totalImages: number
  maxImages: number
  onAddImages: (files: File[]) => void
  onRemoveSavedImage: (url: string) => void
  onRemovePendingImage: (id: string) => void
}

function ColorSizeStockTable({
  rows,
  onChange,
  onRemoveSize,
  error,
}: {
  rows: ProductVariantStockRow[]
  onChange: (rows: ProductVariantStockRow[]) => void
  onRemoveSize?: (size: string) => void
  error?: string
}) {
  if (rows.length === 0) return null

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
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[280px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Tamanho</th>
              <th className="px-3 py-2 font-medium">Estoque disponível</th>
              <th className="px-3 py-2 font-medium text-right" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.cor ?? ''}|${row.tamanho ?? ''}`}
                className="border-b border-border/40 last:border-0"
              >
                <td className="px-3 py-2 font-medium text-foreground">{row.tamanho ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      disabled={row.ilimitado}
                      placeholder={row.ilimitado ? '—' : '0'}
                      value={row.ilimitado ? '' : (row.quantidade ?? '')}
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
                      className="h-9 max-w-[100px]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={row.ilimitado ? 'default' : 'outline'}
                      className="h-8 shrink-0 rounded-lg text-xs"
                      onClick={() => toggleUnlimited(index)}
                    >
                      Ilimitado
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remover tamanho ${row.tamanho ?? ''}`}
                    onClick={() => row.tamanho && onRemoveSize?.(row.tamanho)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function ProductVariantsSection({
  savedImageUrls,
  pendingImages,
  totalImages,
  maxImages,
  onAddImages,
  onRemoveSavedImage,
  onRemovePendingImage,
}: ProductVariantsSectionProps) {
  const form = useFormContext<ProductInput>()
  const temCor = form.watch('tem_cor')
  const temTamanho = form.watch('tem_tamanho')
  const tipoTamanho = form.watch('tipo_tamanho')
  const cores = form.watch('cores') ?? []
  const tamanhos = form.watch('tamanhos') ?? []
  const estoqueVariacoes = form.watch('estoque_variacoes') ?? []

  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [colorDraft, setColorDraft] = useState('')
  const [includeHalfSizes, setIncludeHalfSizes] = useState(() =>
    tamanhos.some((t) => t.includes('.')),
  )
  const [numericDraft, setNumericDraft] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const activeColor = selectedColor && cores.includes(selectedColor) ? selectedColor : cores[0] ?? null

  const previewImage =
    pendingImages[0]?.preview ?? savedImageUrls[0] ?? null

  const colorStockRows = useMemo(() => {
    if (!temCor || !activeColor) return estoqueVariacoes
    return estoqueVariacoes.filter((row) => row.cor === activeColor)
  }, [temCor, activeColor, estoqueVariacoes])

  useEffect(() => {
    const next = syncVariantStockRows(temCor, temTamanho, cores, tamanhos, estoqueVariacoes)
    const currentKeys = estoqueVariacoes.map((r) => `${r.cor ?? ''}|${r.tamanho ?? ''}`).join(',')
    const nextKeys = next.map((r) => `${r.cor ?? ''}|${r.tamanho ?? ''}`).join(',')
    if (currentKeys !== nextKeys) {
      form.setValue('estoque_variacoes', next, { shouldValidate: true })
    }
  }, [temCor, temTamanho, cores, tamanhos, estoqueVariacoes, form])

  function addColor(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    const current = form.getValues('cores') ?? []
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return
    form.setValue('tem_cor', true, { shouldValidate: true })
    form.setValue('cores', [...current, trimmed], { shouldValidate: true })
    setSelectedColor(trimmed)
    setColorDraft('')
  }

  function removeColor(color: string) {
    const next = cores.filter((c) => c !== color)
    form.setValue('cores', next, { shouldValidate: true })
    if (next.length === 0) {
      form.setValue('tem_cor', false, { shouldValidate: true })
      if (!temTamanho) form.setValue('estoque_variacoes', [], { shouldValidate: true })
    }
    if (selectedColor === color) setSelectedColor(next[0] ?? null)
  }

  function enableSizes(type: ProductSizeType = 'roupa') {
    form.setValue('tem_tamanho', true, { shouldValidate: true })
    if (!form.getValues('tipo_tamanho')) {
      form.setValue('tipo_tamanho', type, { shouldValidate: true })
    }
  }

  function removeSizeFromCatalog(size: string) {
    const next = tamanhos.filter((t) => t !== size)
    form.setValue('tamanhos', next, { shouldValidate: true })
    if (next.length === 0) {
      form.setValue('tem_tamanho', false, { shouldValidate: true })
      form.setValue('tipo_tamanho', null, { shouldValidate: true })
      if (!temCor) form.setValue('estoque_variacoes', [], { shouldValidate: true })
    }
  }

  function updateColorStockRows(nextColorRows: ProductVariantStockRow[]) {
    if (!temCor || !activeColor) {
      form.setValue('estoque_variacoes', nextColorRows, { shouldValidate: true })
      return
    }

    const otherRows = estoqueVariacoes.filter((row) => row.cor !== activeColor)
    form.setValue('estoque_variacoes', [...otherRows, ...nextColorRows], { shouldValidate: true })
  }

  function addNumericSize() {
    const trimmed = numericDraft.trim()
    if (!trimmed) return
    enableSizes('numerico')
    const current = form.getValues('tamanhos') ?? []
    if (current.some((v) => v === trimmed)) return
    form.setValue('tamanhos', [...current, trimmed], { shouldValidate: true })
    setNumericDraft('')
  }

  function handleImageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    onAddImages(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(160px,200px)_minmax(180px,220px)_1fr]">
        {/* Cores cadastradas */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Cores cadastradas</p>
            <p className="text-xs text-muted-foreground">Selecione uma cor para editar o estoque</p>
          </div>

          <div className="space-y-2">
            {cores.map((color) => {
              const hex = getColorHex(color)
              const isActive = activeColor === color
              return (
                <div
                  key={color}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border/60 bg-background hover:border-border',
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setSelectedColor(color)}
                  >
                    <span
                      className={cn(
                        'h-5 w-5 shrink-0 rounded-full border',
                        isLightColor(hex) ? 'border-border' : 'border-transparent',
                      )}
                      style={{ backgroundColor: hex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{color}</span>
                      <span className="block text-[10px] uppercase text-muted-foreground">{hex}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remover cor ${color}`}
                    onClick={() => removeColor(color)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Input
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
              placeholder="Nova cor"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addColor(colorDraft)
                }
              }}
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => addColor(colorDraft)}
          >
            <Plus className="h-4 w-4" />
            Adicionar cor
          </button>
        </div>

        {/* Preview da variação */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {activeColor ? `Variação: ${activeColor}` : 'Imagem do produto'}
            </p>
            <p className="text-xs text-muted-foreground">Imagem principal exibida no anúncio</p>
          </div>

          <div
            className={cn(
              'relative overflow-hidden rounded-xl border border-dashed transition-colors',
              isDragOver && 'border-primary bg-primary/5',
            )}
            onDragEnter={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              if (e.currentTarget === e.target) setIsDragOver(false)
            }}
            onDrop={handleImageDrop}
          >
            <div className="relative aspect-square bg-muted/30">
              {previewImage ? (
                <img src={previewImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {totalImages < maxImages ? (
              <label className="flex cursor-pointer items-center justify-center border-t border-border/50 py-2.5 text-xs font-medium text-primary hover:bg-muted/30">
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
                {previewImage ? 'Trocar imagem' : 'Selecionar imagem'}
              </label>
            ) : null}
          </div>

          {totalImages > 1 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {savedImageUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveSavedImage(url)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-destructive"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingImages.map((item) => (
                <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={item.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemovePendingImage(item.id)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-destructive"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Estoque por tamanho */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Estoque por tamanho</p>
              <p className="text-xs text-muted-foreground">
                {activeColor ? `Tamanhos disponíveis para ${activeColor}` : 'Configure os tamanhos do produto'}
              </p>
            </div>
            {temTamanho ? (
              <FormField
                control={form.control}
                name="tipo_tamanho"
                render={({ field }) => (
                  <FormItem className="w-full min-w-[140px] sm:w-auto">
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-xl border border-input bg-background px-2.5 text-xs"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value as ProductSizeType | ''
                          field.onChange(value || null)
                          form.setValue('tamanhos', [], { shouldValidate: true })
                        }}
                      >
                        {(Object.keys(PRODUCT_SIZE_TYPE_LABELS) as ProductSizeType[]).map((key) => (
                          <option key={key} value={key}>
                            {PRODUCT_SIZE_TYPE_LABELS[key]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          {!temTamanho ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Este produto ainda não tem tamanhos</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
                onClick={() => enableSizes('roupa')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar tamanhos
              </Button>
            </div>
          ) : (
            <>
              {tipoTamanho === 'calcado' && (
                <ShoeSizePicker
                  values={tamanhos}
                  onChange={(next) => form.setValue('tamanhos', next, { shouldValidate: true })}
                  includeHalfSizes={includeHalfSizes}
                  onIncludeHalfSizesChange={setIncludeHalfSizes}
                />
              )}
              {tipoTamanho === 'roupa' && (
                <div className="space-y-2">
                  <ClothingSizePicker
                    values={tamanhos}
                    onChange={(next) => form.setValue('tamanhos', next, { shouldValidate: true })}
                  />
                  <VariantOptionsInput
                    values={tamanhos}
                    onChange={(next) => form.setValue('tamanhos', next, { shouldValidate: true })}
                    placeholder="Ou adicione tamanho personalizado"
                  />
                </div>
              )}
              {tipoTamanho === 'numerico' && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={numericDraft}
                    onChange={(e) => setNumericDraft(e.target.value)}
                    placeholder="Ex.: 10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addNumericSize()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addNumericSize}>
                    Adicionar
                  </Button>
                </div>
              )}
              {tipoTamanho === 'livre' && (
                <VariantOptionsInput
                  values={tamanhos}
                  onChange={(next) => form.setValue('tamanhos', next, { shouldValidate: true })}
                  placeholder="Ex.: Único, Kit família"
                />
              )}

              {(temCor || temTamanho) && colorStockRows.length > 0 ? (
                <FormField
                  control={form.control}
                  name="estoque_variacoes"
                  render={({ fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <ColorSizeStockTable
                          rows={colorStockRows}
                          onChange={(nextRows) => {
                            if (temCor && activeColor) {
                              const remapped = nextRows.map((row) => ({ ...row, cor: activeColor }))
                              updateColorStockRows(remapped)
                            } else {
                              form.setValue('estoque_variacoes', nextRows, { shouldValidate: true })
                            }
                          }}
                          onRemoveSize={removeSizeFromCatalog}
                          error={fieldState.error?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : temTamanho && tamanhos.length > 0 && !temCor ? (
                <FormField
                  control={form.control}
                  name="estoque_variacoes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <ColorSizeStockTable
                          rows={field.value ?? []}
                          onChange={field.onChange}
                          onRemoveSize={removeSizeFromCatalog}
                          error={fieldState.error?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {temCor && cores.length > 0 ? (
        <Alert className="flex items-start gap-2.5 border-primary/20 bg-primary/5 text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed">
            Cada cor será exibida como um anúncio individual na página Explorar.
          </p>
        </Alert>
      ) : null}

      <FormField control={form.control} name="cores" render={() => <FormMessage />} />
      <FormField control={form.control} name="tamanhos" render={() => <FormMessage />} />
    </div>
  )
}
