import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { json, error } from '../_shared/response.ts'
import { requireUser } from '../_shared/auth.ts'
import { runSupplierCatalogMatch } from '../_shared/match-engine.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Use POST.', 405)
  }

  const { user, response: authError } = await requireUser(req)
  if (authError) return authError

  const supabase = createServiceClient()

  const { data: supplier, error: supplierErr } = await supabase
    .from('supplier_profiles')
    .select('user_id, status')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (supplierErr || !supplier) {
    return error('FORBIDDEN', 'Perfil de fornecedor não encontrado.', 403)
  }

  if (supplier.status !== 'aprovado') {
    return error('FORBIDDEN', 'Fornecedor precisa estar aprovado.', 403)
  }

  const result = await runSupplierCatalogMatch(supabase, user!.id)
  return json(result)
})
