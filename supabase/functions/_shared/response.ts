import { corsHeaders } from './cors.ts'

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function error(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
  return json({ error: { code, message, details } }, status)
}
