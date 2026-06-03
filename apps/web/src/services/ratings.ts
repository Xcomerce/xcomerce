import { supabase } from '@/lib/supabase'
import type { RatingInput, UserRole } from '@keve/shared'
import type { Tables } from '@keve/shared'

export type Rating = Tables<'ratings'>

export type SubmitRatingInput = RatingInput & {
  orderId: string
  raterId: string
  ratedId: string
  raterRole: UserRole
}

export type PublicProfile = {
  id: string
  full_name: string
  avatar_url: string | null
  role: 'buyer' | 'supplier' | null
  avg_rating: number
  total_ratings: number
  orders_completed: number
  supplier_status: Tables<'supplier_profiles'>['status'] | null
  verified: boolean
}

export async function submitRating(input: SubmitRatingInput): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .insert({
      order_id: input.orderId,
      rater_id: input.raterId,
      rated_id: input.ratedId,
      rater_role: input.raterRole,
      score: input.score,
      comment: input.comment ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Rating
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, primary_role')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  const [buyerRes, supplierRes] = await Promise.all([
    supabase
      .from('buyer_profiles')
      .select('avg_rating, total_ratings, orders_completed')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('supplier_profiles')
      .select('avg_rating, total_ratings, orders_completed, status')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (buyerRes.error) throw buyerRes.error
  if (supplierRes.error) throw supplierRes.error

  const buyer = buyerRes.data
  const supplier = supplierRes.data
  const role =
    supplier && (profile.primary_role === 'supplier' || !buyer)
      ? 'supplier'
      : buyer
        ? 'buyer'
        : null

  const metrics = role === 'supplier' && supplier ? supplier : buyer

  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role,
    avg_rating: metrics?.avg_rating ?? 0,
    total_ratings: metrics?.total_ratings ?? 0,
    orders_completed: metrics?.orders_completed ?? 0,
    supplier_status: supplier?.status ?? null,
    verified: supplier?.status === 'aprovado',
  }
}
