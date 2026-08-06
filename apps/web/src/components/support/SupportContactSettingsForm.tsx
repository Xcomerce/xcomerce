import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Mail, MessageCircle, Clock, Pencil } from 'lucide-react'
import {
  supportContactSettingsSchema,
  DEFAULT_SUPPORT_HOURS,
  type SupportContactSettingsInput,
} from '@keve/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  useSupportContactSettings,
  useUpdateSupportContactSettings,
} from '@/hooks/use-support-settings'
import { toSupportContactFormValues } from '@/services/support-settings'
import { translateSupabaseError } from '@/lib/errors'

export function SupportContactSettingsForm() {
  const { data: settings } = useSupportContactSettings()
  const updateSettings = useUpdateSupportContactSettings()

  const form = useForm<SupportContactSettingsInput>({
    resolver: zodResolver(supportContactSettingsSchema),
    defaultValues: { email: '', whatsapp: '', horario: DEFAULT_SUPPORT_HOURS },
  })

  useEffect(() => {
    if (settings) {
      form.reset(toSupportContactFormValues(settings))
    }
  }, [settings, form])

  async function onSubmit(values: SupportContactSettingsInput) {
    try {
      await updateSettings.mutateAsync(values)
      toast.success('Contatos de suporte atualizados')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro ao salvar'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Editar contatos</CardTitle>
        </div>
        <CardDescription>
          Estes dados aparecem para compradores e fornecedores. Deixe em branco o que não quiser exibir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="suporte@empresa.com.br"
                        className="pl-9"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        inputMode="tel"
                        placeholder="5511999999999"
                        className="pl-9"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    DDI + DDD + número, somente dígitos (ex.: 5511999999999).
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="horario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário de atendimento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder={DEFAULT_SUPPORT_HOURS}
                        className="pl-9"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Texto livre exibido na tela de suporte. Deixe em branco para ocultar.
                  </p>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Salvando...' : 'Salvar contatos'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
