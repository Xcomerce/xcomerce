import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined)
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined)

const PLACEHOLDER_KEY = 'sua-anon-key-publica'

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== PLACEHOLDER_KEY &&
  !supabaseUrl.includes('SEU-PROJECT-REF')

export function getSupabaseProjectLabel(): string {
  if (!supabaseUrl) return 'não configurado'
  const remote = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (remote) return remote[1]
  return supabaseUrl
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
