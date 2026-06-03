import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as chat from '@/services/chat'
import type { OfferMessage, SendMessageInput } from '@/services/chat'

export const chatKeys = {
  all: ['chat'] as const,
  messages: (demandId: string, supplierId: string) =>
    [...chatKeys.all, 'messages', demandId, supplierId] as const,
}

export function useChatMessages(demandId: string | undefined, supplierId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(demandId ?? '', supplierId ?? ''),
    queryFn: () => chat.fetchMessages(demandId!, supplierId!),
    enabled: !!demandId && !!supplierId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SendMessageInput) => chat.sendMessage(input),
    onSuccess: (message) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(message.demand_id, message.supplier_id),
      })
    },
  })
}

export function useChatSubscription(
  demandId: string | undefined,
  supplierId: string | undefined,
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!demandId || !supplierId) return

    const unsubscribe = chat.subscribeMessages(demandId, supplierId, (message) => {
      queryClient.setQueryData<OfferMessage[]>(
        chatKeys.messages(demandId, supplierId),
        (prev) => {
          if (!prev) return [message]
          if (prev.some((m) => m.id === message.id)) return prev
          return [...prev, message]
        },
      )
    })

    return unsubscribe
  }, [demandId, supplierId, queryClient])
}
