import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MapPin, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  buyerAddressSchema,
  formatBuyerAddressSummary,
  type BuyerAddress,
  type BuyerAddressInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { fetchAddressByCep, formatCep } from '@/lib/cep'
import { cn } from '@/lib/utils'
import { BRAZILIAN_UFS } from '@/config/brazil'

const FIELD_CLASS =
  'flex w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export type BuyerAddressFormProps = {
  value?: Partial<BuyerAddress> | null
  readOnly?: boolean
  requiredHint?: string
  saving?: boolean
  onSave: (input: BuyerAddressInput) => Promise<void>
  onCancelEdit?: () => void
  onAddressChange?: (address: Partial<BuyerAddress>) => void
  className?: string
  idPrefix?: string
}

export function BuyerAddressForm({
  value,
  readOnly = false,
  requiredHint,
  saving = false,
  onSave,
  onCancelEdit,
  onAddressChange,
  className,
  idPrefix = 'buyer-address',
}: BuyerAddressFormProps) {
  const [isEditing, setIsEditing] = useState(!readOnly)
  const [cepLoading, setCepLoading] = useState(false)

  const form = useForm<BuyerAddressInput>({
    resolver: zodResolver(buyerAddressSchema),
    defaultValues: {
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      city: '',
      uf: '',
      complemento: '',
    },
  })

  useEffect(() => {
    if (readOnly && value) {
      setIsEditing(false)
    }
  }, [readOnly, value])

  useEffect(() => {
    if (!value) return
    form.reset({
      cep: value.cep ?? '',
      logradouro: value.logradouro ?? '',
      numero: value.numero ?? '',
      bairro: value.bairro ?? '',
      city: value.city ?? '',
      uf: value.uf ?? '',
      complemento: value.complemento ?? '',
    })
  }, [value, form])

  async function handleCepLookup(rawCep: string) {
    const digits = rawCep.replace(/\D/g, '')
    if (digits.length !== 8) return

    setCepLoading(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        toast.error('CEP não encontrado')
        return
      }
      form.setValue('cep', digits, { shouldValidate: true })
      form.setValue('city', address.cidade, { shouldValidate: true })
      form.setValue('uf', address.uf, { shouldValidate: true })
      if (address.logradouro) form.setValue('logradouro', address.logradouro, { shouldValidate: true })
      if (address.bairro) form.setValue('bairro', address.bairro, { shouldValidate: true })
      onAddressChange?.({
        ...form.getValues(),
        cep: digits,
        city: address.cidade,
        uf: address.uf,
        logradouro: address.logradouro || form.getValues('logradouro'),
        bairro: address.bairro || form.getValues('bairro'),
      })
      toast.success('Endereço preenchido pelo CEP')
    } catch {
      toast.error('Não foi possível consultar o CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(values: BuyerAddressInput) {
    const normalized: BuyerAddressInput = {
      ...values,
      cep: values.cep.replace(/\D/g, ''),
      uf: values.uf.toUpperCase(),
      complemento: values.complemento?.trim() || undefined,
    }
    await onSave(normalized)
    onAddressChange?.(normalized)
    if (readOnly) setIsEditing(false)
  }

  function handleStartEdit() {
    setIsEditing(true)
  }

  function handleCancel() {
    if (value) {
      form.reset({
        cep: value.cep ?? '',
        logradouro: value.logradouro ?? '',
        numero: value.numero ?? '',
        bairro: value.bairro ?? '',
        city: value.city ?? '',
        uf: value.uf ?? '',
        complemento: value.complemento ?? '',
      })
    }
    setIsEditing(false)
    onCancelEdit?.()
  }

  const showReadOnlyCard = readOnly && !isEditing && value && value.cep && value.logradouro

  if (showReadOnlyCard) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                Endereço de entrega
              </div>
              <p className="text-sm text-foreground">{formatBuyerAddressSummary(value)}</p>
              <p className="text-xs text-muted-foreground">CEP {formatCep(value.cep ?? '')}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Editar endereço"
              onClick={handleStartEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {requiredHint && (
        <Alert className="border-amber-500/40 bg-amber-500/5 text-foreground">{requiredHint}</Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Informe o CEP para preencher logradouro, bairro, cidade e estado.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <FormField
              control={form.control}
              name="cep"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-5">
                  <FormLabel>CEP</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        id={`${idPrefix}-cep`}
                        inputMode="numeric"
                        placeholder="00000-000"
                        disabled={cepLoading || saving}
                        value={formatCep(field.value ?? '')}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        onBlur={() => void handleCepLookup(field.value ?? '')}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={(field.value ?? '').replace(/\D/g, '').length !== 8 || cepLoading || saving}
                      onClick={() => void handleCepLookup(field.value ?? '')}
                    >
                      {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input id={`${idPrefix}-numero`} placeholder="123" disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bairro"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-5">
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input id={`${idPrefix}-bairro`} placeholder="Ex.: Centro" disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logradouro"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-12">
                  <FormLabel>Logradouro</FormLabel>
                  <FormControl>
                    <Input
                      id={`${idPrefix}-logradouro`}
                      placeholder="Rua, avenida, rodovia..."
                      disabled={saving}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="complemento"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-12">
                  <FormLabel>Complemento (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      id={`${idPrefix}-complemento`}
                      placeholder="Apto, bloco, sala..."
                      disabled={saving}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-8">
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input id={`${idPrefix}-city`} placeholder="Ex.: São Paulo" disabled={saving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uf"
              render={({ field }) => (
                <FormItem className="lg:col-span-4">
                  <FormLabel>Estado (UF)</FormLabel>
                  <FormControl>
                    <select
                      id={`${idPrefix}-uf`}
                      className={cn(FIELD_CLASS, 'h-10 uppercase')}
                      disabled={saving}
                      {...field}
                    >
                      <option value="">Selecione</option>
                      {BRAZILIAN_UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || cepLoading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar endereço
            </Button>
            {readOnly && (
              <Button type="button" variant="outline" disabled={saving} onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

export function buyerAddressToDemandLocation(address: BuyerAddress): { cidade: string; uf: string } {
  return { cidade: address.city, uf: address.uf.toUpperCase() }
}
