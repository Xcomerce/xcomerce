import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getDashboardForRole, loginSchema, type LoginInput, type UserRole } from '@keve/shared'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuth } from '@/contexts/auth-context'
import { translateAuthError } from '@/lib/utils'

function readStoredRole(roles: UserRole[]): UserRole | null {
  const stored = localStorage.getItem('keve.activeRole') as UserRole | null
  if (stored && roles.includes(stored)) return stored
  return roles.length === 1 ? roles[0] : null
}

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginInput) {
    try {
      const bundle = await signIn(values.email, values.password)
      toast.success('Login realizado com sucesso')
      if (!bundle) {
        navigate('/auth/select-role')
        return
      }
      const role = readStoredRole(bundle.roles)
      if (bundle.roles.length > 1 && !role) {
        navigate('/auth/select-role')
        return
      }
      if (role) navigate(getDashboardForRole(role))
      else navigate('/auth/select-role')
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Erro ao entrar'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Entrar</CardTitle>
        <CardDescription>Acesse sua conta Keve B2B</CardDescription>
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
                    <Input type="email" autoComplete="email" placeholder="voce@empresa.com" {...field} />
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
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-right">
              <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link to="/auth/register/buyer" className="text-primary hover:underline">
            Cadastre-se como comprador
          </Link>{' '}
          ou{' '}
          <Link to="/auth/register/supplier" className="text-primary hover:underline">
            fornecedor
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
