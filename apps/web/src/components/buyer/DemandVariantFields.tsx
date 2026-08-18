import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import {
  resolveColorOptions,
  sortSizeValues,
  type DemandInput,
  type ProductSizeType,
} from '@keve/shared'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type VariantOptionSource = {
  temCor?: boolean
  temTamanho?: boolean
  tipoTamanho?: ProductSizeType | null
  cores?: string[]
  tamanhos?: string[]
}

type DemandVariantFieldsProps = {
  optionSource?: VariantOptionSource | null
  nativeFieldClass?: string
}

type ColorGroup = {
  key: string
  indices: number[]
}

function VariantSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  className?: string
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function QuantityInput({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
}: {
  value: unknown
  onChange: (value: number | null) => void
  onBlur: () => void
  name: string
  inputRef: Ref<HTMLInputElement>
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
      value={text}
      onFocus={() => {
        isFocusedRef.current = true
      }}
      onBlur={() => {
        isFocusedRef.current = false
        onBlur()
      }}
      onChange={(event) => {
        const raw = event.target.value
        if (raw !== '' && !/^\d+$/.test(raw)) return
        setText(raw)
        if (raw === '') {
          onChange(null)
          return
        }
        onChange(Number.parseInt(raw, 10))
      }}
    />
  )
}

function buildColorGroups(specifications: DemandInput['especificacoes'], fieldIds: string[]): ColorGroup[] {
  const groups: ColorGroup[] = []
  const groupIndexByColor = new Map<string, number>()

  specifications.forEach((spec, index) => {
    const cor = spec?.cor?.trim() ?? ''
    const key = cor ? cor.toLowerCase() : `__draft__:${fieldIds[index] ?? index}`

    let groupIndex = groupIndexByColor.get(key)
    if (groupIndex === undefined) {
      groupIndex = groups.length
      groupIndexByColor.set(key, groupIndex)
      groups.push({ key, indices: [] })
    }

    groups[groupIndex].indices.push(index)
  })

  return groups
}

export function DemandVariantFields({
  optionSource,
  nativeFieldClass,
}: DemandVariantFieldsProps) {
  const form = useFormContext<DemandInput>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'especificacoes',
  })

  const specifications = form.watch('especificacoes') ?? []
  const colorGroups = useMemo(
    () => buildColorGroups(specifications, fields.map((field) => field.id)),
    [specifications, fields],
  )

  const showColorSelect = Boolean(optionSource?.temCor && (optionSource.cores?.length ?? 0) > 0)
  const showSizeSelect = Boolean(optionSource?.temTamanho && (optionSource.tamanhos?.length ?? 0) > 0)
  const collectsColor = showColorSelect || !showSizeSelect
  const collectsSize = showSizeSelect || !showColorSelect
  const groupedByColor = collectsColor && collectsSize
  const sizeOptions = showSizeSelect
    ? sortSizeValues(optionSource!.tamanhos ?? [], optionSource?.tipoTamanho)
    : []
  const sizeLabel = optionSource?.tipoTamanho === 'calcado' ? 'Numeração' : 'Tamanho'

  function getColorOptions(currentValue?: string) {
    return resolveColorOptions(showColorSelect ? optionSource?.cores : undefined, currentValue)
  }

  function renderColorSelect(value: string, onChange: (value: string) => void) {
    return (
      <VariantSelect
        value={value}
        onChange={onChange}
        options={getColorOptions(value)}
        placeholder="Selecione a cor"
        className={cn(nativeFieldClass, 'h-10')}
      />
    )
  }

  function addColorGroup() {
    append({ cor: '', tamanho: '', quantidade: 1 })
  }

  function addSizeToGroup(groupIndices: number[]) {
    const firstIndex = groupIndices[0]
    if (firstIndex === undefined) {
      addColorGroup()
      return
    }

    const cor = form.getValues(`especificacoes.${firstIndex}.cor`) ?? ''
    append({ cor, tamanho: '', quantidade: 1 })
  }

  function removeGroup(groupIndices: number[]) {
    ;[...groupIndices].sort((a, b) => b - a).forEach((index) => remove(index))
  }

  function updateGroupColor(groupIndices: number[], cor: string) {
    groupIndices.forEach((index) => {
      form.setValue(`especificacoes.${index}.cor`, cor, { shouldDirty: true, shouldValidate: true })
    })
  }

  function renderSizeField(index: number) {
    if (showSizeSelect) {
      return (
        <FormField
          control={form.control}
          name={`especificacoes.${index}.tamanho`}
          render={({ field: sizeField }) => (
            <FormItem className="space-y-1">
              <FormControl>
                <VariantSelect
                  value={sizeField.value ?? ''}
                  onChange={sizeField.onChange}
                  options={sizeOptions}
                  placeholder={`Selecione ${sizeLabel.toLowerCase()}`}
                  className={cn(nativeFieldClass, 'h-10 w-full')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    return (
      <FormField
        control={form.control}
        name={`especificacoes.${index}.tamanho`}
        render={({ field: sizeField }) => (
          <FormItem className="space-y-1">
            <FormControl>
              <Input placeholder="Ex.: M ou 40" {...sizeField} value={sizeField.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  function renderQuantityField(index: number) {
    return (
      <FormField
        control={form.control}
        name={`especificacoes.${index}.quantidade`}
        render={({ field: quantityField }) => (
          <FormItem className="space-y-1">
            <FormControl>
              <QuantityInput
                inputRef={quantityField.ref}
                name={quantityField.name}
                value={quantityField.value}
                onBlur={quantityField.onBlur}
                onChange={(nextValue) => quantityField.onChange(nextValue as never)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  function renderAddSizeLink(groupIndices: number[], groupColor: string) {
    return (
      <Button
        type="button"
        variant="link"
        className="inline-flex h-auto w-fit items-center gap-1 p-0 text-[11px] font-semibold tracking-wide text-primary underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40"
        aria-label="Adicionar tamanho"
        onClick={() => addSizeToGroup(groupIndices)}
        disabled={!groupColor}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </Button>
    )
  }

  function renderGroupedColorField(firstIndex: number, onColorChange: (value: string) => void) {
    return (
      <FormField
        control={form.control}
        name={`especificacoes.${firstIndex}.cor`}
        render={({ field: corField }) => (
          <FormItem className="min-w-0 flex-1 space-y-1">
            <FormControl>
              {renderColorSelect(corField.value ?? '', onColorChange)}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  const mobileFieldLabelClass =
    'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'
  const tableHeadClass =
    'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'
  const tableCellClass = 'px-3 py-2.5 align-top'

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Especificações</p>
          <p className="text-xs text-muted-foreground">
            {groupedByColor
              ? 'Adicione uma cor e, dentro dela, informe cada tamanho com a quantidade desejada.'
              : 'Informe cor, tamanho e quantidade por combinação.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 gap-1.5 sm:w-auto"
          onClick={addColorGroup}
        >
          <Plus className="h-4 w-4" />
          {groupedByColor ? 'Adicionar Cor' : 'Adicionar Cor ou Tamanho'}
        </Button>
      </div>

      {fields.length > 0 && groupedByColor ? (
        <>
          <div className="space-y-3 md:hidden">
            {colorGroups.map((group) => {
              const firstIndex = group.indices[0]
              const groupColor = firstIndex !== undefined ? specifications[firstIndex]?.cor ?? '' : ''

              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card"
                >
                  <div className="flex items-start gap-2 border-b border-border/60 bg-muted/10 p-3">
                    <div className="min-w-0 flex-1">
                      <p className={mobileFieldLabelClass}>Cor</p>
                      {firstIndex !== undefined
                        ? renderGroupedColorField(firstIndex, (value) =>
                            updateGroupColor(group.indices, value),
                          )
                        : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-5 h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remover cor"
                      onClick={() => removeGroup(group.indices)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="divide-y divide-border/60">
                    {group.indices.map((index, rowIndex) => (
                      <div key={fields[index]?.id ?? index} className="space-y-2 p-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-2">
                          <div className="min-w-0">
                            <p className={mobileFieldLabelClass}>{sizeLabel}</p>
                            {renderSizeField(index)}
                          </div>
                          <div>
                            <p className={mobileFieldLabelClass}>Qtd</p>
                            {renderQuantityField(index)}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-destructive"
                            aria-label="Remover tamanho"
                            onClick={() => remove(index)}
                            disabled={group.indices.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {rowIndex === group.indices.length - 1
                          ? renderAddSizeLink(group.indices, groupColor)
                          : null}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className={cn(tableHeadClass, 'w-[30%] min-w-[140px]')}>Cor</th>
                    <th className={tableHeadClass}>{sizeLabel}</th>
                    <th className={cn(tableHeadClass, 'w-28 min-w-[96px]')}>Quantidade</th>
                    <th className={cn(tableHeadClass, 'w-12')} aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {colorGroups.map((group) => {
                    const firstIndex = group.indices[0]
                    const groupColor = firstIndex !== undefined ? specifications[firstIndex]?.cor ?? '' : ''

                    return group.indices.map((index, rowIndex) => (
                      <tr key={fields[index]?.id ?? index}>
                        {rowIndex === 0 ? (
                          <td rowSpan={group.indices.length} className={cn(tableCellClass, 'bg-muted/10')}>
                            <div className="flex min-w-[120px] items-start gap-2">
                              {firstIndex !== undefined
                                ? renderGroupedColorField(firstIndex, (value) =>
                                    updateGroupColor(group.indices, value),
                                  )
                                : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label="Remover cor"
                                onClick={() => removeGroup(group.indices)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        ) : null}
                        <td className={tableCellClass}>
                          <div className="flex flex-col gap-2">
                            {renderSizeField(index)}
                            {rowIndex === group.indices.length - 1
                              ? renderAddSizeLink(group.indices, groupColor)
                              : null}
                          </div>
                        </td>
                        <td className={tableCellClass}>{renderQuantityField(index)}</td>
                        <td className={cn(tableCellClass, 'w-12')}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-destructive"
                            aria-label="Remover tamanho"
                            onClick={() => remove(index)}
                            disabled={group.indices.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {fields.length > 0 && !groupedByColor ? (
        <>
          <div className="space-y-3 md:hidden">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 rounded-xl border border-border/70 bg-card p-3"
              >
                {(showColorSelect || !showSizeSelect) && (
                  <div>
                    <p className={mobileFieldLabelClass}>Cor</p>
                    <FormField
                      control={form.control}
                      name={`especificacoes.${index}.cor`}
                      render={({ field: corField }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            {renderColorSelect(corField.value ?? '', corField.onChange)}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-2">
                  {(showSizeSelect || !showColorSelect) && (
                    <div className="min-w-0">
                      <p className={mobileFieldLabelClass}>{sizeLabel}</p>
                      {renderSizeField(index)}
                    </div>
                  )}
                  <div>
                    <p className={mobileFieldLabelClass}>Qtd</p>
                    {renderQuantityField(index)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive"
                    aria-label="Remover especificação"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {(showColorSelect || !showSizeSelect) && (
                      <th className={cn(tableHeadClass, 'w-[30%] min-w-[140px]')}>Cor</th>
                    )}
                    {(showSizeSelect || !showColorSelect) && (
                      <th className={tableHeadClass}>{sizeLabel}</th>
                    )}
                    <th className={cn(tableHeadClass, 'w-28 min-w-[96px]')}>Quantidade</th>
                    <th className={cn(tableHeadClass, 'w-12')} aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      {(showColorSelect || !showSizeSelect) && (
                        <td className={tableCellClass}>
                          <FormField
                            control={form.control}
                            name={`especificacoes.${index}.cor`}
                            render={({ field: corField }) => (
                              <FormItem className="space-y-1">
                                <FormControl>
                                  {renderColorSelect(corField.value ?? '', corField.onChange)}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                      )}
                      {(showSizeSelect || !showColorSelect) && (
                        <td className={tableCellClass}>{renderSizeField(index)}</td>
                      )}
                      <td className={tableCellClass}>{renderQuantityField(index)}</td>
                      <td className={cn(tableCellClass, 'w-12')}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-muted-foreground hover:text-destructive"
                          aria-label="Remover especificação"
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
          </div>
        </>
      ) : null}
    </div>
  )
}
