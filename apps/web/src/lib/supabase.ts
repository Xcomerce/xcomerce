import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const PLACEHOLDER_KEY = 'your-anon-key-from-supabase-status'
const PLACEHOLDER_URL = 'http://127.0.0.1:54321'

export const isSupabaseConfigured =
  supabaseUrl !== undefined &&
  supabaseAnonKey !== undefined &&
  supabaseAnonKey !== PLACEHOLDER_KEY &&
  !supabaseUrl.includes('placeholder')

export function getSupabaseProjectLabel(): string {
  if (!supabaseUrl) return 'não configurado'
  const remote = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (remote) return remote[1]
  if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')) return 'local'
  return supabaseUrl
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[X COMERCE] Supabase: crie apps/web/.env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Dashboard → Settings → API).',
  )
}

export const supabase = createClient(
  supabaseUrl ?? PLACEHOLDER_URL,
  supabaseAnonKey ?? 'placeholder-key',
)
