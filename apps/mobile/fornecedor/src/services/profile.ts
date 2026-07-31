import { supabase } from '@/lib/supabase'
import type { UserRole, SupplierStatus } from '@keve/shared'

export type UserProfile = {
  id: string
  email: string | null
  full_name: string
  phone: string | null
  avatar_url: string | null
  primary_role: UserRole | null
}

export type UserProfileBundle = {
  profile: UserProfile
  roles: UserRole[]
  supplierStatus: SupplierStatus | null
  hasBuyerProfile: boolean
}

export type UpdateProfileInput = {
  full_name?: string
  phone?: string | null
  avatar_url?: string | null
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', userId)
    .select('id, email, full_name, phone, avatar_url, primary_role')
    .single()

  if (error) throw error
  return data as UserProfile
}

export async function fetchUserProfile(userId: string): Promise<UserProfileBundle | null> {
  const [profileRes, rolesRes, supplierRes, buyerRes] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, phone, avatar_url, primary_role').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('supplier_profiles').select('status').eq('user_id', userId).maybeSingle(),
    supabase.from('buyer_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
  ])

  if (profileRes.error) throw profileRes.error
  if (rolesRes.error) throw rolesRes.error
  if (supplierRes.error) throw supplierRes.error
  if (buyerRes.error) throw buyerRes.error
  if (!profileRes.data) return null

  const roles = (rolesRes.data ?? []).map((r) => r.role as UserRole)

  return {
    profile: profileRes.data as UserProfile,
    roles: roles.length > 0 ? roles : profileRes.data.primary_role ? [profileRes.data.primary_role] : [],
    supplierStatus: (supplierRes.data?.status as SupplierStatus | undefined) ?? null,
    hasBuyerProfile: !!buyerRes.data,
  }
}
