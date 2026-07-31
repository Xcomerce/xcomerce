import { supabase } from '@/lib/supabase'
import type { Tables } from '@keve/shared'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type OfferMessage = Tables<'offer_messages'>

export type SendMessageInput = {
  demandId: string
  supplierId: string
  senderId: string
  recipientId: string
  body: string
  offerId?: string | null
  attachmentPath?: string | null
}

export async function fetchMessages(demandId: string, supplierId: string): Promise<OfferMessage[]> {
  const { data, error } = await supabase
    .from('offer_messages')
    .select('*')
    .eq('demand_id', demandId)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as OfferMessage[]
}

export async function sendMessage(input: SendMessageInput): Promise<OfferMessage> {
  const { data, error } = await supabase
    .from('offer_messages')
    .insert({
      demand_id: input.demandId,
      supplier_id: input.supplierId,
      sender_id: input.senderId,
      recipient_id: input.recipientId,
      body: input.body,
      offer_id: input.offerId ?? null,
      attachment_path: input.attachmentPath ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as OfferMessage
}

export function subscribeMessages(
  demandId: string,
  supplierId: string,
  onMessage: (message: OfferMessage) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`offer_messages:${demandId}:${supplierId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'offer_messages',
        filter: `demand_id=eq.${demandId}`,
      },
      (payload) => {
        const message = payload.new as OfferMessage
        if (message.supplier_id === supplierId) {
          onMessage(message)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
