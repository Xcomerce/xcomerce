const FUNCTIONS_BASE = () =>
  `${Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '')}/functions/v1`

export async function invokeSendEmail(payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${FUNCTIONS_BASE()}/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function invokeSendNotification(payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${FUNCTIONS_BASE()}/send-notification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
