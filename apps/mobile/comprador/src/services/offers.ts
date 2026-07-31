import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'

export type Offer = Tables<'offers'>
export type Order = Tables<'orders'>

export type PublicOffer = {
  id: string
  demand_id: string
  supplier_id: string
  valor: number
  prazo_entrega_dias: number
  validade_dias: number
  validade_ate: string
  quantidade: number
  mensagem: string | null
  status: string
  contact_revealed: boolean
  contact_revealed_at: string | null
  created_at: string
  updated_at: string
  supplier_name: string | null
  supplier_avg_rating: number | null
  supplier_total_ratings: number | null
  supplier_status: string | null
  supplier_phone: string | null
  supplier_email: string | null
}

export async function fetchOffersForDemand(demandId: string): Promise<PublicOffer[]> {
  const { data, error } = await supabase
    .from('v_offers_public')
    .select('*')
    .eq('demand_id', demandId)
    .order('valor', { ascending: true })

  if (error) throw error
  return (data ?? []) as PublicOffer[]
}

export async function revealContact(offerId: string): Promise<Offer> {
  const { data, error } = await supabase
    .from('offers')
    .update({ contact_revealed: true })
    .eq('id', offerId)
    .eq('contact_revealed', false)
    .select()
    .single()

  if (error) throw error
  return data as Offer
}

export async function acceptOffer(offerId: string, buyerId: string): Promise<Order> {
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('id, demand_id, supplier_id, status')
    .eq('id', offerId)
    .single()

  if (offerError) throw offerError
  if (offer.status !== 'enviada') {
    throw new Error('Esta proposta não pode ser aceita no status atual.')
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      demand_id: offer.demand_id,
      offer_id: offer.id,
      buyer_id: buyerId,
      supplier_id: offer.supplier_id,
      status: 'PROPOSTA_ACEITA',
    })
    .select()
    .single()

  if (error) throw error
  return data as Order
}

export async function rejectOffer(offerId: string): Promise<Offer> {
  const { data, error } = await supabase
    .from('offers')
    .update({ status: 'rejeitada' })
    .eq('id', offerId)
    .select()
    .single()

  if (error) throw error
  return data as Offer
}

export async function fetchOfferById(offerId: string): Promise<PublicOffer> {
  const { data, error } = await supabase
    .from('v_offers_public')
    .select('*')
    .eq('id', offerId)
    .single()

  if (error) throw error
  return data as PublicOffer
}
