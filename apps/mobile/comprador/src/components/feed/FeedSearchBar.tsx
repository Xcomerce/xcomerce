import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { ChevronDown, Search } from 'lucide-react-native'
import { BRAZILIAN_UFS } from '@/lib/brazilian-ufs'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  selectedUf: string
  onUfChange: (value: string) => void
}

export function FeedSearchBar({ search, onSearchChange, selectedUf, onUfChange }: Props) {
  const [ufOpen, setUfOpen] = useState(false)

  return (
    <>
      <View className="h-11 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
        <Search size={18} color="#64748b" />
        <TextInput
          className="ml-2 flex-1 py-2 text-sm text-slate-800"
          placeholder="Buscar produto..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={onSearchChange}
        />
        <View className="mx-2 h-5 w-px bg-slate-200" />
        <Pressable
          onPress={() => setUfOpen(true)}
          className="flex-row items-center gap-1 py-2 pl-1 pr-1"
        >
          <Text className={`text-sm font-medium ${selectedUf ? 'text-brand' : 'text-slate-500'}`}>
            {selectedUf || 'UF'}
          </Text>
          <ChevronDown size={14} color="#64748b" />
        </Pressable>
      </View>

      <Modal visible={ufOpen} transparent animationType="fade" onRequestClose={() => setUfOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setUfOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-white" onPress={(e) => e.stopPropagation()}>
            <View className="border-b border-slate-200 px-4 py-4">
              <Text className="text-lg font-bold text-brand-dark">Filtrar por UF</Text>
              <Text className="mt-1 text-sm text-slate-500">Selecione o estado para refinar os produtos do feed.</Text>
            </View>
            <ScrollView className="max-h-80">
              <Pressable
                onPress={() => {
                  onUfChange('')
                  setUfOpen(false)
                }}
                className={`border-b border-slate-100 px-4 py-3 ${!selectedUf ? 'bg-brand/5' : ''}`}
              >
                <Text className={`text-sm ${!selectedUf ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                  Todas as UFs
                </Text>
              </Pressable>
              {BRAZILIAN_UFS.map((uf) => (
                <Pressable
                  key={uf}
                  onPress={() => {
                    onUfChange(uf)
                    setUfOpen(false)
                  }}
                  className={`border-b border-slate-100 px-4 py-3 ${selectedUf === uf ? 'bg-brand/5' : ''}`}
                >
                  <Text className={`text-sm ${selectedUf === uf ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                    {uf}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
