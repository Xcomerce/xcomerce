import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { submitLead } from '@/services/crm'
import { translateSupabaseError } from '@/lib/errors'

const leadSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  profile_type: z.enum(['buyer', 'supplier']).optional(),
  lgpd_consent: z.literal(true, { errorMap: () => ({ message: 'Aceite a política de privacidade' }) }),
})

type LeadFormValues = z.infer<typeof leadSchema>

type Props = {
  defaultProfileType?: 'buyer' | 'supplier'
  source?: string
}

export function LeadCaptureForm({ defaultProfileType, source = 'landing' }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      profile_type: defaultProfileType,
      lgpd_consent: undefined,
    },
  })

  async function onSubmit(values: LeadFormValues) {
    try {
      await submitLead({ ...values, source })
      setSubmitted(true)
      toast.success('Obrigado! Entraremos em contato em breve.')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao enviar'))
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mensagem enviada!</CardTitle>
          <CardDescription>Nossa equipe entrará em contato em breve.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fale com a Keve</CardTitle>
        <CardDescription>Deixe seus dados e nossa equipe comercial retorna em até 24h.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input id="phone" {...form.register('phone')} />
          </div>
          {!defaultProfileType && (
            <div className="space-y-2">
              <Label>Sou</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.watch('profile_type') === 'buyer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => form.setValue('profile_type', 'buyer')}
                >
                  Comprador
                </Button>
                <Button
                  type="button"
                  variant={form.watch('profile_type') === 'supplier' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => form.setValue('profile_type', 'supplier')}
                >
                  Fornecedor
                </Button>
              </div>
            </div>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" {...form.register('lgpd_consent')} />
            <span>
              Concordo com o tratamento dos meus dados conforme a Política de Privacidade (LGPD).
            </span>
          </label>
          {form.formState.errors.lgpd_consent && (
            <p className="text-sm text-destructive">{form.formState.errors.lgpd_consent.message}</p>
          )}
          <Button type="submit" variant="accent" className="w-full" disabled={form.formState.isSubmitting}>
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
