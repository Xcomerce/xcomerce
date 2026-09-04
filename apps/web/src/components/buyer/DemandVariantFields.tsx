import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { normalizeVariantValue, type DemandInput } from '@keve/shared'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { VariantValueAutocomplete } from '@/components/catalog/VariantValueAutocomplete'
import { cn } from '@/lib/utils'

type DemandVariantFieldsProps = {
  categoryId?: string
  nativeFieldClass?: string
}

function QuantityInput({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  onKeyDown,
  className,
}: {
  value: unknown
  onChange: (value: number | null) => void
  onBlur: () => void
  name: string
  inputRef: Ref<HTMLInputElement>
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
}) {
  const formatValue = (nextValue: unknown) =>
    typeof nextValue === 'number' && Number.isFinite(nextValue) ? String(nextValue) : ''

  const [text, setText] = useState(() => formatValue(value))
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (isFocusedRef.current) return
    setText(formatValue(value))
  }, [value])

  return (
    <Input
      ref={inputRef}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={text}
      onFocus={() => {
        isFocusedRef.current = true
      }}
      onBlur={() => {
        isFocusedRef.current = false
        onBlur()
      }}
      onKeyDown={onKeyDown}
      onChange={(event) => {
        const raw = event.target.value
        if (raw !== '' && !/^\d+$/.test(raw)) return
        setText(raw)
        onChange(raw === '' ? null : Number.parseInt(raw, 10))
      }}
    />
  )
}

const DEFAULT_AXES = [{ name: 'Cor' }, { name: 'Tamanho' }]

export function DemandVariantFields({ categoryId, nativeFieldClass }: DemandVariantFieldsProps) {
  const form = useFormContext<DemandInput>()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'especificacoes' })

  const useVariations = form.watch('use_variations') ?? true
  const variantAxes = form.watch('variant_axes') ?? DEFAULT_AXES
  const specifications = form.watch('especificacoes') ?? []
  const selectedCategoryId = categoryId ?? form.watch('category_id')

  const axis1 = variantAxes[0]?.name ?? 'Cor'
  const axis2 = variantAxes[1]?.name ?? 'Tamanho'
  const hasTwoAxes = variantAxes.length >= 2

  const groupInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const sizeInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const qtyInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const totalPieces = useMemo(
    () =>
      specifications.reduce((sum, spec) => sum + (typeof spec.quantidade === 'number' ? spec.quantidade : 0), 0),
    [specifications],
  )

  useEffect(() => {
    if ((form.getValues('variant_axes') ?? []).length === 0) {
      form.setValue('variant_axes', DEFAULT_AXES)
    }
  }, [form])

  function updateAxisName(index: number, name: string) {
    const current = [...(form.getValues('variant_axes') ?? DEFAULT_AXES)]
    current[index] = { name }
    form.setValue('variant_axes', current, { shouldDirty: true })
  }

  function addAxis() {
    const current = form.getValues('variant_axes') ?? DEFAULT_AXES
    if (current.length >= 4) return
    form.setValue('variant_axes', [...current, { name: '' }], { shouldDirty: true })
  }

  function isRowFilled(index: number): boolean {
    const spec = specifications[index]
    if (!spec) return false
    const hasValue = Object.values(spec.values ?? {}).some((v) => v?.trim())
    return Boolean(hasValue || spec.cor?.trim() || spec.tamanho?.trim() || spec.quantidade)
  }

  function addRow(focusField: 'group' | 'size' | 'qty' = 'group') {
    append({
      cor: '',
      tamanho: '',
      values: { [axis1]: '', ...(hasTwoAxes ? { [axis2]: '' } : {}) },
      quantidade: undefined,
    })
    setTimeout(() => {
      if (focusField === 'group') groupInputRefs.current[fields.length]?.focus()
    }, 0)
  }

  function handleGroupEnter(index: number) {
    sizeInputRefs.current[index]?.focus()
  }

  function handleSizeEnter(index: number) {
    qtyInputRefs.current[index]?.focus()
  }

  function handleQtyEnter(index: number) {
    if (!isRowFilled(index)) return
    const nextIndex = index + 1
    if (nextIndex >= fields.length) {
      addRow('size')
      setTimeout(() => sizeInputRefs.current[nextIndex]?.focus(), 0)
    } else {
      sizeInputRefs.current[nextIndex]?.focus()
    }
  }

  function renderAxisValueField(
    index: number,
    axisName: string,
    fieldKey: 'cor' | 'tamanho',
    inputRef?: Ref<HTMLInputElement>,
    onEnter?: () => void,
  ) {
    return (
      <FormField
        control={form.control}
        name={`especificacoes.${index}.${fieldKey}`}
        render={({ field }) => (
          <FormItem className="space-y-1">
            <FormControl>
              <VariantValueAutocomplete
                inputRef={inputRef}
                value={field.value ?? ''}
                onChange={(v) => {
                  field.onChange(v)
                  const values = { ...(form.getValues(`especificacoes.${index}.values`) ?? {}), [axisName]: v }
                  form.setValue(`especificacoes.${index}.values`, values, { shouldDirty: true })
                }}
                categoryId={selectedCategoryId}
                axisName={axisName}
                side="buyer"
                colorAxis={['cor', 'cores'].includes(normalizeVariantValue(axisName))}
                placeholder={`Ex.: ${axisName === 'Cor' ? 'Azul Marinho' : 'M, G'}`}
                className={nativeFieldClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onEnter?.()
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  if (!useVariations) {
    return (
      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Quantidade total</p>
            <p className="text-xs text-muted-foreground">Informe apenas a quantidade, sem variações.</p>
          </div>
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              checked={useVariations}
              onCheckedChange={(checked) => form.setValue('use_variations', checked, { shouldDirty: true })}
            />
            <Label className="text-sm">Variações</Label>
          </div>
        </div>
        <FormField
          control={form.control}
          name="quantidade"
          render={({ field }) => (
            <FormItem className="max-w-[160px]">
              <FormControl>
                <QuantityInput
                  inputRef={field.ref}
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(v) => field.onChange(v ?? undefined)}
                  className={nativeFieldClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Especificações</p>
            <div className="flex min-h-11 items-center gap-3">
              <Switch
                checked={useVariations}
                onCheckedChange={(checked) => form.setValue('use_variations', checked, { shouldDirty: true })}
              />
              <Label className="text-sm text-muted-foreground">Variações</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {variantAxes.map((axis, i) => (
              <Input
                key={i}
                value={axis.name}
                onChange={(e) => updateAxisName(i, e.target.value)}
                className={cn(nativeFieldClass, 'h-auto min-h-11 w-32 text-base md:min-h-8 md:text-xs')}
                placeholder="Nome do eixo"
              />
            ))}
            {variantAxes.length < 4 ? (
              <Button type="button" variant="ghost" className="min-h-11 px-3 md:min-h-9" onClick={addAxis}>
                + Eixo
              </Button>
            ) : null}
          </div>
          {totalPieces > 0 ? (
            <p className="text-xs text-muted-foreground">Total: {totalPieces} peças</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full shrink-0 gap-1.5 sm:w-auto md:min-h-9"
          onClick={() => addRow('group')}
        >
          <Plus className="h-4 w-4" />
          Adicionar linha
        </Button>
      </div>

      {fields.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {axis1}
                </th>
                {hasTwoAxes ? (
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {axis2}
                  </th>
                ) : null}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quantidade
                </th>
                <th className="w-12 px-3 py-2.5" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-3 py-2.5 align-top">
                    {renderAxisValueField(
                        index,
                        axis1,
                        'cor',
                        (el) => {
                          groupInputRefs.current[index] = el
                        },
                        () => handleGroupEnter(index),
                      )}
                  </td>
                  {hasTwoAxes ? (
                    <td className="px-3 py-2.5 align-top">
                      {renderAxisValueField(
                        index,
                        axis2,
                        'tamanho',
                        (el) => {
                          sizeInputRefs.current[index] = el
                        },
                        () => handleSizeEnter(index),
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 align-top">
                    <FormField
                      control={form.control}
                      name={`especificacoes.${index}.quantidade`}
                      render={({ field: qtyField }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <QuantityInput
                              inputRef={(el) => {
                                qtyInputRefs.current[index] = el
                                if (typeof qtyField.ref === 'function') qtyField.ref(el)
                              }}
                              name={qtyField.name}
                              value={qtyField.value}
                              onBlur={qtyField.onBlur}
                              onChange={(v) => qtyField.onChange(v as never)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleQtyEnter(index)
                                }
                              }}
                              className={nativeFieldClass}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
