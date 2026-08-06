import { supabase } from '@/lib/supabase'
import { SUPPORT_CONTACT_SETTINGS_ID, DEFAULT_SUPPORT_HOURS } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type SupportContactSettings = Tables<'support_contact_settings'>

export async function fetchSupportContactSettings(): Promise<SupportContactSettings> {
  const { data, error } = await supabase
    .from('support_contact_settings')
    .select('*')
    .eq('id', SUPPORT_CONTACT_SETTINGS_ID)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return {
      id: SUPPORT_CONTACT_SETTINGS_ID,
      email: null,
      whatsapp: null,
      horario: DEFAULT_SUPPORT_HOURS,
      updated_at: new Date().toISOString(),
    }
  }

  return data as SupportContactSettings
}
