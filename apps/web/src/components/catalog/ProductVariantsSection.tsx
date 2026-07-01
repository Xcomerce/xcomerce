import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  PRODUCT_SIZE_TYPE_LABELS,
  type ProductInput,
  type ProductSizeType,
} from '@keve/shared'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { VariantOptionsInput } from '@/components/catalog/VariantOptionsInput'
import { ShoeSizePicker } from '@/components/catalog/ShoeSizePicker'
import { ClothingSizePicker } from '@/components/catalog/ClothingSizePicker'

export function ProductVariantsSection() {
  const form = useFormContext<ProductInput>()
  const temCor = form.watch('tem_cor')
  const temTamanho = form.watch('tem_tamanho')
  const tipoTamanho = form.watch('tipo_tamanho')
  const tamanhos = form.watch('tamanhos') ?? []
  const [includeHalfSizes, setIncludeHalfSizes] = useState(() =>
    tamanhos.some((t) => t.includes('.')),
  )
  const [numericDraft, setNumericDraft] = useState('')

  function handleTemCorChange(checked: boolean) {
    form.setValue('tem_cor', checked, { shouldValidate: true })
    if (!checked) form.setValue('cores', [], { shouldValidate: true })
  }

  function handleTemTamanhoChange(checked: boolean) {
    form.setValue('tem_tamanho', checked, { shouldValidate: true })
    if (!checked) {
      form.setValue('tipo_tamanho', null, { shouldValidate: true })
      form.setValue('tamanhos', [], { shouldValidate: true })
    } else if (!form.getValues('tipo_tamanho')) {
      form.setValue('tipo_tamanho', 'livre', { shouldValidate: true })
    }
  }

  function addNumericSize() {
    const trimmed = numericDraft.trim()
    if (!trimmed) return
    const current = form.getValues('tamanhos') ?? []
    if (current.some((v) => v === trimmed)) return
    form.setValue('tamanhos', [...current, trimmed], { shouldValidate: true })
    setNumericDraft('')
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Variações (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Informe cor e tamanho quando o produto tiver variações.
        </p>
      </div>

      <FormField
        control={form.control}
        name="tem_cor"
        render={() => (
          <FormItem className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <FormLabel className="!mt-0">Este produto tem cor</FormLabel>
              <Switch checked={Boolean(temCor)} onCheckedChange={handleTemCorChange} />
            </div>
            {temCor && (
              <FormField
                control={form.control}
                name="cores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cores disponíveis</FormLabel>
                    <FormControl>
                      <VariantOptionsInput
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Ex.: Branco, Preto, Azul"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tem_tamanho"
        render={() => (
          <FormItem className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <FormLabel className="!mt-0">Este produto tem tamanho</FormLabel>
              <Switch checked={Boolean(temTamanho)} onCheckedChange={handleTemTamanhoChange} />
            </div>
            {temTamanho && (
              <>
                <FormField
                  control={form.control}
                  name="tipo_tamanho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de tamanho</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const value = e.target.value as ProductSizeType | ''
                            field.onChange(value || null)
                            form.setValue('tamanhos', [], { shouldValidate: true })
                          }}
                        >
                          <option value="">Selecione...</option>
                          {(Object.keys(PRODUCT_SIZE_TYPE_LABELS) as ProductSizeType[]).map(
                            (key) => (
                              <option key={key} value={key}>
                                {PRODUCT_SIZE_TYPE_LABELS[key]}
                              </option>
                            ),
                          )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tamanhos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanhos disponíveis</FormLabel>
                      <FormControl>
                        <div>
                          {tipoTamanho === 'calcado' && (
                            <ShoeSizePicker
                              values={field.value ?? []}
                              onChange={field.onChange}
                              includeHalfSizes={includeHalfSizes}
                              onIncludeHalfSizesChange={setIncludeHalfSizes}
                            />
                          )}
                          {tipoTamanho === 'roupa' && (
                            <div className="space-y-2">
                              <ClothingSizePicker values={field.value ?? []} onChange={field.onChange} />
                              <VariantOptionsInput
                                values={field.value ?? []}
                                onChange={field.onChange}
                                placeholder="Ou adicione tamanho personalizado"
                              />
                            </div>
                          )}
                          {tipoTamanho === 'numerico' && (
                            <div className="space-y-2">
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
                                <Button type="button" variant="secondary" onClick={addNumericSize}>
                                  Adicionar
                                </Button>
                              </div>
                              <VariantOptionsInput
                                values={field.value ?? []}
                                onChange={field.onChange}
                                placeholder="Ou digite e pressione Enter"
                              />
                            </div>
                          )}
                          {(tipoTamanho === 'livre' || !tipoTamanho) && (
                            <VariantOptionsInput
                              values={field.value ?? []}
                              onChange={field.onChange}
                              placeholder="Ex.: Único, Kit família"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </FormItem>
        )}
      />
    </div>
  )
}
