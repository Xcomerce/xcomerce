import { createUserClient } from './supabase.ts'
import { error } from './response.ts'

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export function validateServiceRole(req: Request): boolean {
  const token = getBearerToken(req)
  return token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}

export function validateCronSecret(req: Request): boolean {
  const token = getBearerToken(req)
  return token === Deno.env.get('CRON_SECRET')
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, response: error('UNAUTHORIZED', 'Não autenticado.', 401) }
  }

  const token = authHeader.slice(7)
  const supabase = createUserClient(authHeader)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { user: null, response: error('UNAUTHORIZED', 'Token inválido ou expirado.', 401) }
  }
  return { user, response: null, supabase }
}
