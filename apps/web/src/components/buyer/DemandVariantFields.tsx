import { useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import {
  sortSizeValues,
  type DemandInput,
  type ProductSizeType,
} from '@keve/shared'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
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

export function DemandVariantFields({
  optionSource,
  nativeFieldClass,
}: DemandVariantFieldsProps) {
  const form = useFormContext<DemandInput>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'especificacoes',
  })

  const showColorSelect = Boolean(optionSource?.temCor && (optionSource.cores?.length ?? 0) > 0)
  const showSizeSelect = Boolean(optionSource?.temTamanho && (optionSource.tamanhos?.length ?? 0) > 0)
  const sizeOptions = showSizeSelect
    ? sortSizeValues(optionSource!.tamanhos ?? [], optionSource?.tipoTamanho)
    : []
  const sizeLabel = optionSource?.tipoTamanho === 'calcado' ? 'Numeração' : 'Tamanho'

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Especificações</p>
          <p className="text-xs text-muted-foreground">
            Clique em Adicionar para informar cor, tamanho e quantidade por combinação.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => append({ cor: '', tamanho: '', quantidade: 1 })}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {fields.length > 0 && (
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(96px,120px)_auto] sm:items-end"
          >
            <FormField
              control={form.control}
              name={`especificacoes.${index}.cor`}
              render={({ field: corField }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    {showColorSelect ? (
                      <VariantSelect
                        value={corField.value ?? ''}
                        onChange={corField.onChange}
                        options={optionSource!.cores ?? []}
                        placeholder="Selecione a cor"
                        className={cn(nativeFieldClass, 'h-10')}
                      />
                    ) : (
                      <Input placeholder="Ex.: Branco" {...corField} value={corField.value ?? ''} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`especificacoes.${index}.tamanho`}
              render={({ field: sizeField }) => (
                <FormItem>
                  <FormLabel>{sizeLabel}</FormLabel>
                  <FormControl>
                    {showSizeSelect ? (
                      <VariantSelect
                        value={sizeField.value ?? ''}
                        onChange={sizeField.onChange}
                        options={sizeOptions}
                        placeholder={`Selecione ${sizeLabel.toLowerCase()}`}
                        className={cn(nativeFieldClass, 'h-10')}
                      />
                    ) : (
                      <Input placeholder="Ex.: M ou 40" {...sizeField} value={sizeField.value ?? ''} />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`especificacoes.${index}.quantidade`}
              render={({ field: quantityField }) => (
                <FormItem>
                  <FormLabel required>Quantidade</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      required
                      {...quantityField}
                      value={quantityField.value ?? 1}
                      onChange={(event) => quantityField.onChange(Number(event.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Remover especificação"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
