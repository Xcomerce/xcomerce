import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@keve/shared'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuth } from '@/contexts/auth-context'
import { translateAuthError } from '@/lib/utils'
import { consumeLeadInvite, getInviteLead } from '@/services/crm'
import { supabase } from '@/lib/supabase'

type RegisterPageProps = {
  role: 'buyer' | 'supplier'
}

export function RegisterPage({ role }: RegisterPageProps) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const inviteToken = params.get('invite')
  const { signUp } = useAuth()
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: undefined,
    },
  })

  useEffect(() => {
    if (!inviteToken) return
    let cancelled = false
    ;(async () => {
      try {
        const lead = await getInviteLead(inviteToken)
        if (cancelled || !lead) return
        form.setValue('fullName', lead.name)
        form.setValue('email', lead.email)
        if (lead.phone) form.setValue('phone', lead.phone)
        toast.message('Convite válido — complete o cadastro')
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Convite inválido')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [inviteToken, form])

  async function onSubmit(values: RegisterInput) {
    try {
      await signUp(values, role)
      if (inviteToken) {
        const { data: auth } = await supabase.auth.getUser()
        if (auth.user) {
          try {
            await consumeLeadInvite(inviteToken, auth.user.id)
          } catch {
            /* cadastro ok mesmo se conversão falhar */
          }
        }
      }
      toast.success('Conta criada com sucesso')
      navigate(role === 'buyer' ? '/buyer/dashboard' : '/supplier/onboarding')
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Erro ao cadastrar'))
    }
  }

  const title = role === 'buyer' ? 'Cadastro comprador' : 'Cadastro fornecedor'
  const description =
    role === 'buyer'
      ? 'Publique demandas e receba propostas de fornecedores verificados'
      : 'Cadastre-se e complete o onboarding para vender na plataforma'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border"
                      checked={field.value === true}
                      onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal leading-snug">
                    Aceito os termos de uso e política de privacidade
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="accent" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Cadastrando...' : 'Criar conta'}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
