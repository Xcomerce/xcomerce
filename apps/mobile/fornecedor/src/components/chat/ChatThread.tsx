import { useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/auth-context'
import { useChatMessages, useChatSubscription, useSendMessage } from '@/hooks/use-chat'
import { formatSupabaseError } from '@/lib/errors'

type ChatThreadProps = {
  demandId: string
  supplierId: string
  recipientId: string
  offerId?: string
}

export function ChatThread({ demandId, supplierId, recipientId, offerId }: ChatThreadProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList>(null)

  const { data: messages = [], isLoading } = useChatMessages(demandId, supplierId)
  useChatSubscription(demandId, supplierId)
  const sendMessage = useSendMessage()

  const handleSend = async () => {
    if (!text.trim() || !user) return
    setError(null)
    try {
      await sendMessage.mutateAsync({
        demandId,
        supplierId,
        senderId: user.id,
        recipientId,
        body: text.trim(),
        offerId: offerId ?? null,
      })
      setText('')
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (err) {
      setError(formatSupabaseError(err))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50">
        {isLoading ? (
          <Text className="p-4 text-slate-500">Carregando mensagens...</Text>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <View
                    className={`rounded-2xl px-3 py-2 ${mine ? 'bg-brand' : 'bg-white border border-slate-200'}`}
                  >
                    <Text className={mine ? 'text-white' : 'text-slate-800'}>{item.body}</Text>
                  </View>
                </View>
              )
            }}
            ListEmptyComponent={
              <Text className="text-center text-sm text-slate-500">Nenhuma mensagem ainda.</Text>
            }
          />
        )}
        {error ? <Text className="px-3 pb-1 text-xs text-red-500">{error}</Text> : null}
        <View className="flex-row items-end gap-2 border-t border-slate-200 p-3">
          <TextInput
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base"
            placeholder="Digite sua mensagem..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <Button label="Enviar" onPress={handleSend} loading={sendMessage.isPending} className="px-4" />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
