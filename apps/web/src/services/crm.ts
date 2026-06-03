import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type CrmLead = Tables<'crm_leads'>

export type LeadInput = {
  name: string
  email: string
  phone?: string
  profile_type?: 'buyer' | 'supplier'
  lgpd_consent: boolean
  source?: string
  notes?: string
}

export async function submitLead(input: LeadInput): Promise<CrmLead> {
  const { data, error } = await supabase
    .from('crm_leads')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      profile_type: input.profile_type ?? null,
      lgpd_consent: input.lgpd_consent,
      lgpd_consent_at: input.lgpd_consent ? new Date().toISOString() : null,
      source: input.source ?? 'landing',
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CrmLead
}
