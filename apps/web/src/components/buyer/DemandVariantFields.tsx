import { sortSizeValues, type ProductSizeType } from '@keve/shared'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

type VariantOptionSource = {
  temCor?: boolean
  temTamanho?: boolean
  tipoTamanho?: ProductSizeType | null
  cores?: string[]
  tamanhos?: string[]
}

type DemandVariantFieldsProps<T extends FieldValues> = {
  control: Control<T>
  corName: FieldPath<T>
  tamanhoName: FieldPath<T>
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

export function DemandVariantFields<T extends FieldValues>({
  control,
  corName,
  tamanhoName,
  optionSource,
  nativeFieldClass,
}: DemandVariantFieldsProps<T>) {
  const showColorSelect = Boolean(optionSource?.temCor && (optionSource.cores?.length ?? 0) > 0)
  const showSizeSelect = Boolean(optionSource?.temTamanho && (optionSource.tamanhos?.length ?? 0) > 0)
  const sizeOptions = showSizeSelect
    ? sortSizeValues(optionSource!.tamanhos ?? [], optionSource?.tipoTamanho)
    : []
  const sizeLabel = optionSource?.tipoTamanho === 'calcado' ? 'Numeração' : 'Tamanho'

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Especificações (opcional)</p>
        <p className="text-xs text-muted-foreground">Preencha se aplicável ao seu pedido.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={corName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor (opcional)</FormLabel>
              <FormControl>
                {showColorSelect ? (
                  <VariantSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={optionSource!.cores ?? []}
                    placeholder="Selecione a cor"
                    className={cn(nativeFieldClass, 'h-10')}
                  />
                ) : (
                  <Input placeholder="Ex.: Branco" {...field} value={field.value ?? ''} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={tamanhoName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{sizeLabel} (opcional)</FormLabel>
              <FormControl>
                {showSizeSelect ? (
                  <VariantSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={sizeOptions}
                    placeholder={`Selecione ${sizeLabel.toLowerCase()}`}
                    className={cn(nativeFieldClass, 'h-10')}
                  />
                ) : (
                  <Input placeholder="Ex.: M ou 40" {...field} value={field.value ?? ''} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
