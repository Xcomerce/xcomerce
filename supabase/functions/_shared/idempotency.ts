import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type IdempotencyRecord = {
  key: string
  response: Record<string, unknown> | null
}

export async function checkIdempotency(
  supabase: SupabaseClient,
  key: string,
): Promise<IdempotencyRecord | null> {
  const { data } = await supabase
    .from('idempotency_keys')
    .select('key, response')
    .eq('key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (!data) return null
  return {
    key: data.key,
    response: (data.response as Record<string, unknown>) ?? null,
  }
}

export async function markIdempotency(
  supabase: SupabaseClient,
  key: string,
  scope: string,
  response: Record<string, unknown>,
  ttlHours = 168,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
  await supabase.from('idempotency_keys').insert({
    key,
    scope,
    response,
    expires_at: expiresAt,
  })
}
